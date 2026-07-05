import { buildVariableResources, buildHashmapResources, DEFAULT_AUDIO_FORMAT, DEFAULT_IMAGE_FORMAT } from './resourceInventory';
import type { FlowData, FlowNodeProbe, ValidationResult } from '../types/flow';

export const validateFlow = (flowData: FlowData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodes = flowData.nodes;
  const nodeIds = Object.keys(nodes);
  const variables = flowData.variables || {};
  const hashmaps = flowData.hashmaps || {};
  const mappings = flowData.audio_mappings || {};

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
            audioFiles.add(item);
          }
        });
      }
      if (node.audio.fallback) audioFiles.add(node.audio.fallback);
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

  // Ressources générées automatiquement pour chaque valeur de variable/hashmap
  const audioFormat = flowData.resource_formats?.audio || DEFAULT_AUDIO_FORMAT;
  const imageFormat = flowData.resource_formats?.image || DEFAULT_IMAGE_FORMAT;

  const variableResources = buildVariableResources(variables, mappings, audioFormat, imageFormat);
  const hashmapResources = buildHashmapResources(hashmaps, mappings, audioFormat, imageFormat);

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
