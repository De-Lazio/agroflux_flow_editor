import { describe, it, expect } from 'vitest';
import { validateFlow } from './validator';
import type { FlowData, RootNodeData, GridNodeData, ResultNodeData } from '../types/flow';

// Construit un flowData minimal valide, que chaque test dérive et casse
// volontairement sur un seul aspect à la fois.
const baseAudio = (key: string) => ({
  type: 'sequence' as const,
  key,
  sequence: [`intro/${key}.mp3`],
  fallback: 'intro/default.mp3'
});

const buildFlow = (overrides: Partial<FlowData> = {}): FlowData => ({
  version: '1.0',
  entry: 'root',
  audio_mappings: {},
  variables: {},
  hashmaps: {},
  languages: ['fr'],
  nodes: {
    root: {
      type: 'root',
      audio: baseAudio('root'),
      options: [{ id: 'go', next: 'grid_1' }]
    },
    grid_1: {
      type: 'grid',
      audio: baseAudio('grid_1'),
      options_source: 'produits',
      set: 'produits',
      next: 'result_1'
    },
    result_1: {
      type: 'result',
      audio: baseAudio('result_1'),
      data_source: { endpoint: 'api/x', params: ['produit'] }
    }
  },
  ...overrides
});

describe('validateFlow — cas nominal', () => {
  it('ne remonte aucune erreur ni avertissement sur un flow bien formé', () => {
    const { errors, warnings } = validateFlow(buildFlow());
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });
});

describe('validateFlow — erreurs bloquantes', () => {
  it("signale l'absence de audio_mappings à la racine", () => {
    // On simule un JSON externe malformé : audio_mappings est un champ requis
    // du schéma, mais rien ne garantit qu'un fichier importé le respecte.
    const { audio_mappings, ...incompleteFlow } = buildFlow();
    const { errors } = validateFlow(incompleteFlow as FlowData);
    expect(errors.some((e) => e.includes('audio_mappings'))).toBe(true);
  });

  it("signale l'absence de l'objet audio sur un nœud", () => {
    const flow = buildFlow();
    delete flow.nodes.grid_1.audio;
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes('grid_1') && e.includes("'audio' est manquant"))).toBe(true);
  });

  it('signale deux nœuds partageant la même audio.key', () => {
    const flow = buildFlow();
    flow.nodes.grid_1.audio!.key = 'root';
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes("déjà utilisée"))).toBe(true);
  });

  it('signale un json_response_contrat invalide', () => {
    const flow = buildFlow();
    flow.nodes.result_1.json_response_contrat = '{ invalide';
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes('result_1') && e.includes('json_response_contrat'))).toBe(true);
  });

  it('signale un exemple de réponse invalide', () => {
    const flow = buildFlow();
    (flow.nodes.result_1 as ResultNodeData).response_examples = ['{ invalide'];
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes("exemple de réponse"))).toBe(true);
  });

  it('signale une option pointant vers un ID inexistant', () => {
    const flow = buildFlow();
    (flow.nodes.root as RootNodeData).options[0].next = 'ne_existe_pas';
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes('ne_existe_pas'))).toBe(true);
  });

  it('signale un next pointant vers un ID inexistant', () => {
    const flow = buildFlow();
    (flow.nodes.grid_1 as GridNodeData).next = 'ne_existe_pas';
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes('grid_1') && e.includes('ne_existe_pas'))).toBe(true);
  });

  it('signale un nom de paramètre vide dans data_source.params', () => {
    const flow = buildFlow();
    (flow.nodes.result_1 as ResultNodeData).data_source.params = ['produit', ''];
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes('result_1') && e.includes('vide'))).toBe(true);
  });

  it('signale un paramètre dupliqué dans data_source.params', () => {
    const flow = buildFlow();
    (flow.nodes.result_1 as ResultNodeData).data_source.params = ['produit', 'produit'];
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes('result_1') && e.includes('double'))).toBe(true);
  });

  it("ne plante pas si data_source.params contient une entrée non-string (JSON importé à la main)", () => {
    const flow = buildFlow();
    // Cast volontaire : simule un flow.json édité à la main où le typage TS n'est pas garanti à l'exécution.
    (flow.nodes.result_1 as ResultNodeData).data_source.params = ['produit', 42 as unknown as string];
    expect(() => validateFlow(flow)).not.toThrow();
    const { errors } = validateFlow(flow);
    expect(errors.some((e) => e.includes('result_1') && e.includes('invalide'))).toBe(true);
  });
});

describe('validateFlow — avertissements', () => {
  it('signale une séquence audio vide', () => {
    const flow = buildFlow();
    flow.nodes.grid_1.audio!.sequence = [];
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('grid_1') && w.includes('vide'))).toBe(true);
  });

  it('signale un nœud root sans option', () => {
    const flow = buildFlow();
    (flow.nodes.root as RootNodeData).options = [];
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('root') && w.includes('aucune option'))).toBe(true);
  });

  it('signale un nœud orphelin', () => {
    const flow = buildFlow({
      nodes: {
        ...buildFlow().nodes,
        orphelin: { type: 'grid', audio: baseAudio('orphelin'), options_source: 'produits', set: 'produits', next: 'result_1' }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('orphelin') && w.includes('référencé'))).toBe(true);
  });

  it('signale un cul-de-sac (grid/calendrier/pre_filter sans next)', () => {
    const flow = buildFlow();
    (flow.nodes.grid_1 as GridNodeData).next = '';
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('grid_1') && w.includes('cul-de-sac'))).toBe(true);
  });

  it("ne signale pas de cul-de-sac pour un nœud result (terminal par nature)", () => {
    const { warnings } = validateFlow(buildFlow());
    expect(warnings.some((w) => w.includes('result_1') && w.includes('cul-de-sac'))).toBe(false);
  });

  it('signale un champ "set" vide sur un nœud grid', () => {
    const flow = buildFlow();
    (flow.nodes.grid_1 as GridNodeData).set = '';
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('grid_1') && w.includes('"set"'))).toBe(true);
  });

  it('signale un champ "set" vide sur un nœud calendrier', () => {
    const flow = buildFlow({
      nodes: {
        ...buildFlow().nodes,
        cal_1: { type: 'calendrier', audio: baseAudio('cal_1'), periode: 7, cadran: 'centrer', set: '', next: 'result_1' }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('cal_1') && w.includes('"set"'))).toBe(true);
  });

  it('signale un champ "set" vide sur un nœud pre_filter', () => {
    const flow = buildFlow({
      nodes: {
        ...buildFlow().nodes,
        pf_1: { type: 'pre_filter', audio: baseAudio('pf_1'), cle: 'departements', filtre_source: 'marches', set: '', next: 'result_1' }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('pf_1') && w.includes('"set"'))).toBe(true);
  });

  it('ne signale rien quand "set" est rempli sur grid/calendrier/pre_filter', () => {
    const { warnings } = validateFlow(buildFlow());
    expect(warnings.some((w) => w.includes('"set"'))).toBe(false);
  });

  it('signale un mapping ressource manquant pour une variable déclarée', () => {
    const flow = buildFlow({ variables: { produits: ['mais'] } });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('produits') && w.includes('mapping ressource'))).toBe(true);
  });

  it('ne signale rien si le mapping ressource est présent', () => {
    const flow = buildFlow({ variables: { produits: ['mais'] }, audio_mappings: { produits: 'produits' } });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('mapping ressource'))).toBe(false);
  });

  it('signale une collision quand deux mappings pointent vers le même dossier', () => {
    const flow = buildFlow({
      variables: { produits: ['mais'] },
      hashmaps: { produits_alt: { a: ['x'] } },
      audio_mappings: { produits: 'partage', produits_alt: 'partage' }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('partage') && w.includes('partagé'))).toBe(true);
  });

  it('signale un data_source.params vide (probable oubli)', () => {
    const flow = buildFlow();
    (flow.nodes.result_1 as ResultNodeData).data_source.params = [];
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('result_1') && w.includes('vide'))).toBe(true);
  });

  it("signale une méthode HTTP non reconnue (JSON importé à la main hors de l'énum)", () => {
    const flow = buildFlow();
    (flow.nodes.result_1 as ResultNodeData).data_source.method = 'PATCH' as unknown as ResultNodeData['data_source']['method'];
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('result_1') && w.includes('PATCH') && w.includes('reconnue'))).toBe(true);
  });
});

describe('validateFlow — cohérence des méthodes HTTP', () => {
  it('signale un même endpoint utilisé avec des méthodes différentes', () => {
    const flow = buildFlow({
      nodes: {
        ...buildFlow().nodes,
        result_2: {
          type: 'result',
          audio: baseAudio('result_2'),
          data_source: { endpoint: 'api/x', params: ['produit'], method: 'GET' }
        }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('api/x') && w.includes('méthodes HTTP'))).toBe(true);
  });

  it('ne signale rien si un même endpoint est toujours utilisé avec la même méthode (implicite POST)', () => {
    const flow = buildFlow({
      nodes: {
        ...buildFlow().nodes,
        result_2: {
          type: 'result',
          audio: baseAudio('result_2'),
          data_source: { endpoint: 'api/x', params: ['produit'] }
        }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('méthodes HTTP'))).toBe(false);
  });
});

describe('validateFlow — détection de cycles', () => {
  it('signale une boucle sans issue (aucun de ses nœuds n\'atteint un "result")', () => {
    const flow = buildFlow({
      entry: 'grid_a',
      nodes: {
        grid_a: { type: 'grid', audio: baseAudio('grid_a'), options_source: 'produits', set: 'produits', next: 'grid_b' },
        grid_b: { type: 'grid', audio: baseAudio('grid_b'), options_source: 'produits', set: 'produits', next: 'grid_a' }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('Boucle sans issue') && w.includes('grid_a') && w.includes('grid_b'))).toBe(true);
  });

  it('ne signale pas une boucle volontaire qui dispose d\'une porte de sortie vers un "result"', () => {
    const flow = buildFlow({
      entry: 'grid_a',
      nodes: {
        grid_a: { type: 'grid', audio: baseAudio('grid_a'), options_source: 'produits', set: 'produits', next: 'grid_b' },
        grid_b: {
          type: 'root',
          audio: baseAudio('grid_b'),
          options: [
            { id: 'retour', next: 'grid_a' },
            { id: 'continuer', next: 'result_1' }
          ]
        },
        result_1: { type: 'result', audio: baseAudio('result_1'), data_source: { endpoint: 'api/x', params: ['produit'] } }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('Boucle sans issue'))).toBe(false);
  });
});

describe('validateFlow — cohérence de active_overrides', () => {
  it('ne signale rien quand active_overrides est absent', () => {
    const { warnings } = validateFlow(buildFlow({ variables: { produits: ['mais'] }, audio_mappings: { produits: 'produits' } }));
    expect(warnings.some((w) => w.includes('active_overrides'))).toBe(false);
  });

  it('ne signale rien quand toutes les exceptions référencent des valeurs existantes', () => {
    const flow = buildFlow({
      variables: { produits: ['mais', 'riz'] },
      hashmaps: { marche_par_departement: { oueme: ['ouando', 'adjohoun'] } },
      audio_mappings: { produits: 'produits', marche_par_departement: 'marche_par_departement' },
      active_overrides: {
        variables: { produits: ['riz'] },
        hashmaps: { marche_par_departement: { inactive_values: { oueme: ['adjohoun'] } } }
      }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('active_overrides'))).toBe(false);
  });

  it('signale une variable inexistante référencée par active_overrides', () => {
    const flow = buildFlow({
      active_overrides: { variables: { ne_existe_pas: ['x'] }, hashmaps: {} }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('active_overrides') && w.includes('ne_existe_pas') && w.includes('variable inexistante'))).toBe(true);
  });

  it('signale une valeur de variable inexistante référencée par active_overrides', () => {
    const flow = buildFlow({
      variables: { produits: ['mais'] },
      audio_mappings: { produits: 'produits' },
      active_overrides: { variables: { produits: ['sorgho'] }, hashmaps: {} }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('active_overrides') && w.includes('sorgho') && w.includes('produits'))).toBe(true);
  });

  it('signale un hashmap inexistant référencé par active_overrides', () => {
    const flow = buildFlow({
      active_overrides: { variables: {}, hashmaps: { ne_existe_pas: { inactive_keys: ['x'] } } }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('active_overrides') && w.includes('ne_existe_pas') && w.includes('hashmap inexistant'))).toBe(true);
  });

  it('signale une clé de hashmap inexistante référencée via inactive_keys', () => {
    const flow = buildFlow({
      hashmaps: { marche_par_departement: { oueme: ['ouando'] } },
      audio_mappings: { marche_par_departement: 'marche_par_departement' },
      active_overrides: { variables: {}, hashmaps: { marche_par_departement: { inactive_keys: ['plateau'] } } }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('active_overrides') && w.includes('plateau') && w.includes('clé inexistante'))).toBe(true);
  });

  it('signale une clé de hashmap inexistante référencée via inactive_values', () => {
    const flow = buildFlow({
      hashmaps: { marche_par_departement: { oueme: ['ouando'] } },
      audio_mappings: { marche_par_departement: 'marche_par_departement' },
      active_overrides: { variables: {}, hashmaps: { marche_par_departement: { inactive_values: { plateau: ['ketou'] } } } }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('active_overrides') && w.includes('plateau') && w.includes('clé inexistante'))).toBe(true);
  });

  it('signale une valeur inexistante référencée via inactive_values pour une clé existante', () => {
    const flow = buildFlow({
      hashmaps: { marche_par_departement: { oueme: ['ouando'] } },
      audio_mappings: { marche_par_departement: 'marche_par_departement' },
      active_overrides: { variables: {}, hashmaps: { marche_par_departement: { inactive_values: { oueme: ['adjohoun'] } } } }
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('active_overrides') && w.includes('adjohoun') && w.includes('oueme'))).toBe(true);
  });
});

describe('validateFlow — cohérence de hashmaps_no_resources', () => {
  it('ne signale rien quand hashmaps_no_resources est absent', () => {
    const { warnings } = validateFlow(buildFlow());
    expect(warnings.some((w) => w.includes('hashmaps_no_resources'))).toBe(false);
  });

  it('ne signale rien pour un hashmap existant', () => {
    const flow = buildFlow({
      hashmaps: { marche_par_departement: { oueme: ['ouando'] } },
      audio_mappings: { marche_par_departement: 'marche_par_departement' },
      hashmaps_no_resources: ['marche_par_departement']
    });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('hashmaps_no_resources'))).toBe(false);
  });

  it('signale un hashmap inexistant référencé par hashmaps_no_resources', () => {
    const flow = buildFlow({ hashmaps_no_resources: ['ne_existe_pas'] });
    const { warnings } = validateFlow(flow);
    expect(warnings.some((w) => w.includes('hashmaps_no_resources') && w.includes('ne_existe_pas'))).toBe(true);
  });
});

describe('validateFlow — rapport d\'inventaire', () => {
  it('recense les audios référencés directement dans les nœuds', () => {
    const { report } = validateFlow(buildFlow());
    expect(report.audios).toContain('intro/root.mp3');
    expect(report.audios).toContain('intro/default.mp3');
  });

  it('génère les ressources par variable, séparément des ressources par hashmap', () => {
    const flow = buildFlow({
      variables: { produits: ['mais', 'riz'] },
      hashmaps: { marche_par_departement: { oueme: ['ouando'] } },
      audio_mappings: { produits: 'produits', marche_par_departement: 'marche_par_departement' }
    });

    const { report } = validateFlow(flow);

    expect(report.variableResources.audios).toEqual([
      'audio/fr/produits/mais.mp3',
      'audio/fr/produits/riz.mp3'
    ]);
    expect(report.hashmapResources.audios).toEqual([
      'audio/fr/marche_par_departement/oueme/ouando.mp3'
    ]);

    // Les ressources générées doivent aussi apparaître dans la liste globale
    expect(report.audios).toContain('audio/fr/produits/mais.mp3');
    expect(report.audios).toContain('audio/fr/marche_par_departement/oueme/ouando.mp3');
  });

  it('exclut du rapport un hashmap listé dans hashmaps_no_resources (audio et image)', () => {
    const flow = buildFlow({
      variables: { produits: ['mais'] },
      hashmaps: { marche_par_departement: { oueme: ['ouando'] } },
      audio_mappings: { produits: 'produits', marche_par_departement: 'marche_par_departement' },
      hashmaps_no_resources: ['marche_par_departement']
    });

    const { report } = validateFlow(flow);

    expect(report.hashmapResources.audios).toEqual([]);
    expect(report.hashmapResources.images).toEqual([]);
    expect(report.audios).not.toContain('audio/fr/marche_par_departement/oueme/ouando.mp3');
    expect(report.images).not.toContain('images/marche_par_departement/oueme/ouando.jpeg');
    // Les ressources de variable, elles, ne sont pas affectées.
    expect(report.variableResources.audios).toEqual(['audio/fr/produits/mais.mp3']);
  });

  it('respecte les formats de ressources déclarés dans le flow', () => {
    const flow = buildFlow({
      variables: { produits: ['mais'] },
      audio_mappings: { produits: 'produits' },
      resource_formats: { audio: 'wav', image: 'png' }
    });

    const { report } = validateFlow(flow);
    expect(report.variableResources.audios).toEqual(['audio/fr/produits/mais.wav']);
    expect(report.variableResources.images).toEqual(['images/produits/mais.png']);
  });

  it('génère un audio par langue déclarée (jamais l\'image, qui reste unique)', () => {
    const flow = buildFlow({
      variables: { produits: ['mais'] },
      audio_mappings: { produits: 'produits' },
      languages: ['fr', 'fon', 'yoruba']
    });

    const { report } = validateFlow(flow);
    // variableResources.audios est trié alphabétiquement par validateFlow (voir validator.ts).
    expect(report.variableResources.audios).toEqual([
      'audio/fon/produits/mais.mp3',
      'audio/fr/produits/mais.mp3',
      'audio/yoruba/produits/mais.mp3'
    ]);
    expect(report.variableResources.images).toEqual(['images/produits/mais.jpeg']);
  });
});
