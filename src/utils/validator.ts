import { buildVariableResources, buildHashmapResources, DEFAULT_AUDIO_FORMAT, DEFAULT_IMAGE_FORMAT } from './resourceInventory';
import { toLanguageAudioPath } from './simulationResources';
import { DEFAULT_LANGUAGES } from './languages';
import { DEFAULT_HTTP_METHOD } from '../types/flow';
import type { FlowData, FlowNodeProbe, FlowNodes, HttpMethod, ValidationResult } from '../types/flow';

const VALID_HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

// Cible(s) suivante(s) d'un nœud, tous types confondus : un root fan-out vers
// plusieurs options, les autres types de navigation n'ont qu'un seul "next",
// et "result" n'a jamais de suite (terminal par nature).
const nextTargetsOf = (node: FlowNodeProbe): string[] => {
  if (node.options) return node.options.map((opt) => opt.next).filter(Boolean);
  return node.next ? [node.next] : [];
};

// Tout nœud d'où un nœud "result" est atteignable (lui-même inclus) : calculé
// par parcours du graphe inversé, en partant de chaque "result" existant.
const computeCanTerminate = (nodes: FlowNodes, nodeIds: string[]): Set<string> => {
  const reverse = new Map<string, string[]>();
  nodeIds.forEach((id) => {
    nextTargetsOf(nodes[id] as FlowNodeProbe).forEach((target) => {
      if (!reverse.has(target)) reverse.set(target, []);
      reverse.get(target)!.push(id);
    });
  });

  const canTerminate = new Set<string>();
  const queue = nodeIds.filter((id) => nodes[id].type === 'result');
  queue.forEach((id) => canTerminate.add(id));

  // Index de lecture plutôt que `shift()` (O(n) par appel, donc O(n²) sur la
  // BFS entière) : `queue` ne rétrécit jamais, on avance juste `head`.
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    (reverse.get(current) || []).forEach((ancestor) => {
      if (!canTerminate.has(ancestor)) {
        canTerminate.add(ancestor);
        queue.push(ancestor);
      }
    });
  }

  return canTerminate;
};

// Détection de cycles par DFS classique (coloration blanc/gris/noir) : un
// nœud encore "gris" rencontré en cours de parcours signale un cycle, dont
// les membres sont la portion de la pile courante allant de ce nœud au
// sommet. Un nœud "noir" (déjà entièrement exploré) n'est jamais reparcouru,
// donc chaque cycle n'est remonté qu'une seule fois.
const findCycles = (nodes: FlowNodes, nodeIds: string[]): string[][] => {
  const nodeIdSet = new Set(nodeIds);
  const color = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const stackIndex = new Map<string, number>(); // position de chaque nœud "gris" dans `stack`, pour un slice O(1) au lieu d'un indexOf O(n)
  const cycles: string[][] = [];

  const visit = (id: string) => {
    color.set(id, 1);
    stackIndex.set(id, stack.length);
    stack.push(id);

    nextTargetsOf(nodes[id] as FlowNodeProbe).forEach((target) => {
      if (!nodeIdSet.has(target)) return; // lien cassé, déjà signalé en erreur ailleurs
      const state = color.get(target);
      if (!state) {
        visit(target);
      } else if (state === 1) {
        cycles.push(stack.slice(stackIndex.get(target)));
      }
    });

    stack.pop();
    stackIndex.delete(id);
    color.set(id, 2);
  };

  nodeIds.forEach((id) => {
    if (!color.get(id)) visit(id);
  });

  return cycles;
};

export const validateFlow = (flowData: FlowData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodes = flowData.nodes;
  const nodeIds = Object.keys(nodes);
  const variables = flowData.variables || {};
  const hashmaps = flowData.hashmaps || {};
  const mappings = flowData.audio_mappings || {};
  const languages = flowData.languages || DEFAULT_LANGUAGES;

  const audioKeys = new Set<string>();
  const audioFiles = new Set<string>();
  const imageFiles = new Set<string>();
  const usedVars = new Set<string>();

  if (!flowData.audio_mappings) {
    errors.push("L'objet 'audio_mappings' est manquant à la racine du JSON.");
  }

  nodeIds.forEach((id) => {
    const node = nodes[id];
    const fields = node as FlowNodeProbe;

    // Validation de l'objet audio
    if (!node.audio) {
      errors.push(`Nœud "${id}" : L'objet 'audio' est manquant.`);
    } else {
      if (!node.audio.key) {
        errors.push(`Nœud "${id}" : 'audio.key' est manquant.`);
      } else if (audioKeys.has(node.audio.key)) {
        errors.push(`Nœud "${id}" : La clé audio '${node.audio.key}' est déjà utilisée par un autre nœud.`);
      } else {
        audioKeys.add(node.audio.key);
      }

      if (!node.audio.sequence || node.audio.sequence.length === 0) {
        warnings.push(`Nœud "${id}" : La séquence audio est vide.`);
      } else {
        node.audio.sequence.forEach((item) => {
          if (!item) return;
          const match = item.match(/\{([^}:]+)(?::[^}]+)?\}/);
          if (match) {
            usedVars.add(match[1]);
          } else {
            // Chemin littéral sans dimension langue (voir
            // API_BACKEND_ROUTES.md §3.2) : un fichier attendu par langue,
            // même convention que les ressources de variables/hashmaps
            // ci-dessous.
            languages.forEach((lang) => audioFiles.add(toLanguageAudioPath(lang, item)));
          }
        });
      }
      if (node.audio.fallback) {
        const fallback = node.audio.fallback;
        languages.forEach((lang) => audioFiles.add(toLanguageAudioPath(lang, fallback)));
      }
    }

    // Images référencées dans les nœuds Result (via le champ comment)
    if (node.type === 'result' && node.comment) {
      const matches = node.comment.match(/"image":\s*"([^"]+)"/g);
      if (matches) {
        matches.forEach((m) => {
          const img = m.match(/"image":\s*"([^"]+)"/)?.[1];
          if (img) imageFiles.add(img);
        });
      }
    }

    if (fields.options_source) usedVars.add(fields.options_source);
    if (fields.set) usedVars.add(fields.set);
    if (fields.cle) usedVars.add(fields.cle);

    // Validation du contrat de réponse JSON
    if (node.json_response_contrat) {
      try {
        JSON.parse(node.json_response_contrat);
      } catch {
        errors.push(`Nœud "${id}" : Le champ 'json_response_contrat' n'est pas un JSON valide.`);
      }
    }

    // Validation des exemples de réponse
    if (fields.response_examples && Array.isArray(fields.response_examples)) {
      fields.response_examples.forEach((ex, idx) => {
        try {
          JSON.parse(ex);
        } catch {
          errors.push(`Nœud "${id}" : L'exemple de réponse #${idx + 1} n'est pas un JSON valide.`);
        }
      });
    }

    // Cohérence de data_source.params (nœud result) : le Studio ne connaît pas de
    // schéma backend réel, seulement la forme interne de cette liste de noms.
    // `param` est typé `string` mais vient potentiellement d'un JSON importé à la
    // main (non garanti par le compilateur) — on vérifie le type avant `.trim()`
    // pour ne jamais planter toute la validation sur une entrée malformée (ex. un
    // nombre au lieu d'une chaîne).
    if (node.type === 'result') {
      const params = node.data_source?.params || [];
      const seenParams = new Set<string>();
      params.forEach((param) => {
        if (typeof param !== 'string' || !param.trim()) {
          errors.push(`Nœud "${id}" : data_source.params contient un nom de paramètre vide ou invalide.`);
        } else if (seenParams.has(param)) {
          errors.push(`Nœud "${id}" : data_source.params contient le paramètre "${param}" en double.`);
        } else {
          seenParams.add(param);
        }
      });
      if (params.length === 0) {
        warnings.push(`Nœud "${id}" : data_source.params est vide (probable oubli de déclarer les paramètres de l'API).`);
      }

      const method = node.data_source?.method;
      if (method && !VALID_HTTP_METHODS.includes(method)) {
        warnings.push(`Nœud "${id}" : data_source.method "${method}" n'est pas une méthode HTTP reconnue (GET, POST, PUT, DELETE).`);
      }
    }

    // Options (nœud root)
    if (fields.options) {
      if (fields.options.length === 0 && node.type === 'root') {
        warnings.push(`Nœud "${id}" (${node.type}) n'a aucune option.`);
      }

      fields.options.forEach((option) => {
        if (option.next && !nodeIds.includes(option.next)) {
          errors.push(`Nœud "${id}" : L'option "${option.id}" pointe vers un ID inexistant "${option.next}".`);
        }
      });
    }

    // Lien next (grid, calendrier, pre_filter)
    if (fields.next && !nodeIds.includes(fields.next)) {
      errors.push(`Nœud "${id}" : next pointe vers un ID inexistant "${fields.next}".`);
    }

    // Cul-de-sac : un nœud de navigation doit toujours mener quelque part
    if (['grid', 'calendrier', 'pre_filter'].includes(node.type) && !fields.next) {
      warnings.push(`Nœud "${id}" (${node.type}) n'a pas de "next" : ce nœud est un cul-de-sac.`);
    }

    // Paramètre de stockage (set) : seuls root et result n'en ont pas besoin
    // (root ne collecte rien, result est terminal) — grid, calendrier et
    // pre_filter doivent tous nommer le paramètre API sous lequel la valeur
    // choisie sera transmise au nœud "result" en aval.
    if (['grid', 'calendrier', 'pre_filter'].includes(node.type) && !fields.set) {
      warnings.push(`Nœud "${id}" (${node.type}) : le champ "set" est vide — la valeur choisie ne sera transmise à aucun paramètre exploitable par un nœud "result" en aval.`);
    }

    // Nœud orphelin (sauf point d'entrée)
    if (id !== flowData.entry) {
      const isTarget = nodeIds.some((otherId) => {
        const otherFields = nodes[otherId] as FlowNodeProbe;
        const inOptions = otherFields.options?.some((opt) => opt.next === id);
        const inNext = otherFields.next === id;
        return inOptions || inNext;
      });

      if (!isTarget) {
        warnings.push(`Nœud orphelin : "${id}" n'est référencé par aucun autre nœud.`);
      }
    }
  });

  // Cohérence des méthodes HTTP : un même endpoint utilisé avec des méthodes
  // différentes selon les nœuds est probablement une incohérence (jamais
  // bloquant, le Studio ne connaît pas l'intention réelle du concepteur).
  const endpointMethods = new Map<string, Set<string>>();
  nodeIds.forEach((id) => {
    const node = nodes[id];
    if (node.type !== 'result' || !node.data_source?.endpoint) return;
    const endpoint = node.data_source.endpoint;
    const method = node.data_source.method || DEFAULT_HTTP_METHOD;
    if (!endpointMethods.has(endpoint)) endpointMethods.set(endpoint, new Set());
    endpointMethods.get(endpoint)!.add(method);
  });
  endpointMethods.forEach((methods, endpoint) => {
    if (methods.size > 1) {
      warnings.push(`L'endpoint "${endpoint}" est utilisé avec plusieurs méthodes HTTP différentes : ${[...methods].sort().join(', ')}.`);
    }
  });

  // Détection de cycles (avertissement uniquement) : une boucle n'est un
  // problème que si aucun de ses nœuds ne peut jamais atteindre un "result" —
  // sinon c'est une boucle volontaire avec une porte de sortie.
  const canTerminate = computeCanTerminate(nodes, nodeIds);
  findCycles(nodes, nodeIds).forEach((cycle) => {
    const hasExit = cycle.some((id) => canTerminate.has(id));
    if (!hasExit) {
      warnings.push(`Boucle sans issue détectée (aucun de ces nœuds n'atteint jamais de nœud "result") : ${cycle.join(' → ')}.`);
    }
  });

  // Validation du mapping de ressources (variables + hashmaps)
  const mappingNames = [...Object.keys(variables), ...Object.keys(hashmaps)];
  const folderOwners: Record<string, string[]> = {};

  mappingNames.forEach((name) => {
    if (!mappings[name]) {
      warnings.push(`Le mapping ressource de "${name}" est manquant. Ouvrez "Mapping Audio & Image" et cliquez sur "Régénérer".`);
    }
    const folder = mappings[name] || name;
    if (!folderOwners[folder]) folderOwners[folder] = [];
    folderOwners[folder].push(name);
  });

  Object.entries(folderOwners).forEach(([folder, owners]) => {
    if (owners.length > 1) {
      warnings.push(`Le dossier de ressources "${folder}" est partagé par plusieurs mappings : ${owners.join(', ')}.`);
    }
  });

  // Garde-fou de cohérence de l'overlay actif (voir PLAN_ACTIVE_STATE.md) :
  // une exception qui ne pointe plus vers une variable/valeur/hashmap/clé
  // existante est sans effet (elle ne correspond à rien), mais signale que le
  // nettoyage attendu à la suppression/au renommage n'a pas eu lieu.
  const activeOverrides = flowData.active_overrides || { variables: {}, hashmaps: {} };

  Object.entries(activeOverrides.variables || {}).forEach(([varName, inactiveValues]) => {
    if (!variables[varName]) {
      warnings.push(`active_overrides référence une variable inexistante : "${varName}".`);
      return;
    }
    inactiveValues.forEach((value) => {
      if (!variables[varName].includes(value)) {
        warnings.push(`active_overrides référence une valeur inexistante "${value}" pour la variable "${varName}".`);
      }
    });
  });

  Object.entries(activeOverrides.hashmaps || {}).forEach(([mapName, override]) => {
    const hashmap = hashmaps[mapName];
    if (!hashmap) {
      warnings.push(`active_overrides référence un hashmap inexistant : "${mapName}".`);
      return;
    }

    (override.inactive_keys || []).forEach((key) => {
      if (!hashmap[key]) {
        warnings.push(`active_overrides référence une clé inexistante "${key}" pour le hashmap "${mapName}".`);
      }
    });

    Object.entries(override.inactive_values || {}).forEach(([key, values]) => {
      if (!hashmap[key]) {
        warnings.push(`active_overrides référence une clé inexistante "${key}" pour le hashmap "${mapName}".`);
        return;
      }
      values.forEach((value) => {
        if (!hashmap[key].includes(value)) {
          warnings.push(`active_overrides référence une valeur inexistante "${value}" pour la clé "${key}" du hashmap "${mapName}".`);
        }
      });
    });
  });

  const hashmapsNoResources = flowData.hashmaps_no_resources || [];
  hashmapsNoResources.forEach((mapName) => {
    if (!hashmaps[mapName]) {
      warnings.push(`hashmaps_no_resources référence un hashmap inexistant : "${mapName}".`);
    }
  });

  // Ressources générées automatiquement pour chaque valeur de variable/hashmap
  const audioFormat = flowData.resource_formats?.audio || DEFAULT_AUDIO_FORMAT;
  const imageFormat = flowData.resource_formats?.image || DEFAULT_IMAGE_FORMAT;

  const variableResources = buildVariableResources(variables, mappings, languages, audioFormat, imageFormat);
  const hashmapResources = buildHashmapResources(hashmaps, mappings, languages, audioFormat, imageFormat, hashmapsNoResources);

  variableResources.audios.forEach((a) => audioFiles.add(a));
  variableResources.images.forEach((i) => imageFiles.add(i));
  hashmapResources.audios.forEach((a) => audioFiles.add(a));
  hashmapResources.images.forEach((i) => imageFiles.add(i));

  return {
    errors,
    warnings,
    report: {
      audios: Array.from(audioFiles).sort(),
      images: Array.from(imageFiles).sort(),
      variables: Array.from(usedVars).sort(),
      variableResources: {
        audios: [...variableResources.audios].sort(),
        images: [...variableResources.images].sort()
      },
      hashmapResources: {
        audios: [...hashmapResources.audios].sort(),
        images: [...hashmapResources.images].sort()
      }
    }
  };
};
