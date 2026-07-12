import { describe, it, expect } from 'vitest';
import {
  createInitialContext,
  stepBack,
  jumpToStep,
  resolveRootOptions,
  resolveGridOptions,
  resolvePreFilterOptions,
  computeCalendarWindow,
  resolveStep,
  advance,
  computeMissingParams,
  buildRequest,
  substitutePlaceholders,
  buildMockResponse,
  parseAudioSequence,
  ALL_OPTION_VALUE
} from './simulationEngine';
import type { SimulationContext } from './simulationEngine';
import type {
  FlowData,
  RootNodeData,
  GridNodeData,
  PreFilterNodeData,
  CalendrierNodeData,
  ResultNodeData
} from '../types/flow';

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
  variables: { produits: ['mais', 'riz'], departements: ['oueme', 'plateau'] },
  hashmaps: { marches_par_departement: { oueme: ['bohicon', 'porto_novo'], plateau: [] } },
  languages: ['fr'],
  nodes: {
    root: {
      type: 'root',
      audio: baseAudio('root'),
      options: [{ id: 'achat', next: 'grid_produit' }]
    },
    grid_produit: {
      type: 'grid',
      audio: baseAudio('grid_produit'),
      options_source: 'produits',
      set: 'produit',
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

describe('contexte de navigation', () => {
  it('createInitialContext démarre vide', () => {
    expect(createInitialContext()).toEqual({ values: {}, history: [] });
  });

  it('stepBack retire la dernière étape et recalcule values', () => {
    const flow = buildFlow();
    const step1 = advance(flow, 'root', createInitialContext(), 'achat');
    const step2 = advance(flow, 'grid_produit', step1.context, 'riz');
    expect(step2.context.values).toEqual({ produit: 'riz' });

    const back = stepBack(step2.context);
    expect(back.values).toEqual({});
    expect(back.history).toHaveLength(1);
  });

  it('stepBack sur un contexte vide ne fait rien', () => {
    const empty = createInitialContext();
    expect(stepBack(empty)).toBe(empty);
  });

  it('jumpToStep revient à un point arbitraire de l\'historique (fil d\'Ariane)', () => {
    const flow = buildFlow({
      nodes: {
        ...buildFlow().nodes,
        grid_departement: { type: 'grid', audio: baseAudio('grid_departement'), options_source: 'departements', set: 'departement', next: 'result_1' }
      }
    });
    const s1 = advance(flow, 'root', createInitialContext(), 'achat');
    const s2 = advance(flow, 'grid_produit', s1.context, 'riz');
    const s3 = advance(flow, 'grid_departement', s2.context, 'oueme');
    expect(s3.context.values).toEqual({ produit: 'riz', departement: 'oueme' });
    // history: [0]=root, [1]=grid_produit(produit=riz), [2]=grid_departement(departement=oueme)

    // Revenir à l'index 2 (le nœud grid_departement lui-même, juste avant sa
    // propre décision) : ne conserve que ce qui a été collecté AVANT lui.
    const backToDepartementStep = jumpToStep(s3.context, 2);
    expect(backToDepartementStep.values).toEqual({ produit: 'riz' });
    expect(backToDepartementStep.history).toHaveLength(2);
    expect(backToDepartementStep.history[1].nodeId).toBe('grid_produit');

    // Revenir à l'index 1 (le nœud grid_produit lui-même) : rien n'est
    // encore collecté avant lui, seul le passage par root est gardé.
    const backToProduitStep = jumpToStep(s3.context, 1);
    expect(backToProduitStep.values).toEqual({});
    expect(backToProduitStep.history).toEqual([{ nodeId: 'root', paramName: undefined, value: undefined }]);
  });

  it('jumpToStep avec un index <= 0 revient à l\'état initial', () => {
    const flow = buildFlow();
    const s1 = advance(flow, 'root', createInitialContext(), 'achat');
    const s2 = advance(flow, 'grid_produit', s1.context, 'riz');
    expect(jumpToStep(s2.context, 0)).toEqual({ values: {}, history: [] });
    expect(jumpToStep(s2.context, -5)).toEqual({ values: {}, history: [] });
  });
});

describe('résolution des options — root', () => {
  it('retourne un couple value/label par option', () => {
    const node = buildFlow().nodes.root as RootNodeData;
    expect(resolveRootOptions(node)).toEqual([{ value: 'achat', label: 'achat' }]);
  });
});

describe('résolution des options — grid', () => {
  it('liste les valeurs de la variable options_source', () => {
    const flow = buildFlow();
    const node = flow.nodes.grid_produit as GridNodeData;
    expect(resolveGridOptions(node, flow)).toEqual([
      { value: 'mais', label: 'mais' },
      { value: 'riz', label: 'riz' }
    ]);
  });

  it('filtre les valeurs inactives quand controle_active est activé', () => {
    const flow = buildFlow({ active_overrides: { variables: { produits: ['riz'] }, hashmaps: {} } });
    const node = { ...(flow.nodes.grid_produit as GridNodeData), controle_active: true };
    expect(resolveGridOptions(node, flow)).toEqual([{ value: 'mais', label: 'mais' }]);
  });

  it('ignore active_overrides quand controle_active est absent', () => {
    const flow = buildFlow({ active_overrides: { variables: { produits: ['riz'] }, hashmaps: {} } });
    const node = flow.nodes.grid_produit as GridNodeData;
    expect(resolveGridOptions(node, flow)).toHaveLength(2);
  });

  it('ajoute une option "Tout" synthétique quand can_choix_all est activé', () => {
    const flow = buildFlow();
    const node = { ...(flow.nodes.grid_produit as GridNodeData), can_choix_all: true };
    const options = resolveGridOptions(node, flow);
    expect(options[0]).toEqual({ value: ALL_OPTION_VALUE, label: 'Tout' });
    expect(options).toHaveLength(3);
  });
});

describe('résolution des options — pre_filter', () => {
  const preFilterNode: PreFilterNodeData = {
    type: 'pre_filter',
    audio: baseAudio('pf'),
    cle: 'departements',
    filtre_source: 'marches_par_departement',
    set: 'marche',
    next: 'result_1'
  };

  it('filtre le hashmap par la clé déjà collectée dans le contexte', () => {
    const flow = buildFlow();
    const context: SimulationContext = { values: { departements: 'oueme' }, history: [] };
    const res = resolvePreFilterOptions(preFilterNode, flow, context);
    expect(res.options).toEqual([
      { value: 'bohicon', label: 'bohicon' },
      { value: 'porto_novo', label: 'porto_novo' }
    ]);
    expect(res.error).toBeUndefined();
    expect(res.warning).toBeUndefined();
  });

  it("signale une erreur si la clé n'a jamais été collectée", () => {
    const flow = buildFlow();
    const res = resolvePreFilterOptions(preFilterNode, flow, createInitialContext());
    expect(res.options).toEqual([]);
    expect(res.error).toContain('departements');
  });

  it('signale un avertissement si la liste filtrée est vide (trou de données)', () => {
    const flow = buildFlow();
    const context: SimulationContext = { values: { departements: 'plateau' }, history: [] };
    const res = resolvePreFilterOptions(preFilterNode, flow, context);
    expect(res.options).toEqual([]);
    expect(res.warning).toContain('plateau');
  });

  it('signale un avertissement si la clé elle-même est désactivée', () => {
    const flow = buildFlow({
      active_overrides: {
        variables: {},
        hashmaps: { marches_par_departement: { inactive_keys: ['oueme'] } }
      }
    });
    const node = { ...preFilterNode, controle_active: true };
    const context: SimulationContext = { values: { departements: 'oueme' }, history: [] };
    const res = resolvePreFilterOptions(node, flow, context);
    expect(res.options).toEqual([]);
    expect(res.warning).toContain('désactivée');
  });
});

describe('calendrier — fenêtre de dates', () => {
  const today = new Date('2026-03-10T00:00:00.000Z');

  it('cadran "centrer" répartit la période autour d\'aujourd\'hui', () => {
    const node: CalendrierNodeData = { type: 'calendrier', audio: baseAudio('c'), periode: 7, cadran: 'centrer', set: 'date', next: 'x' };
    expect(computeCalendarWindow(node, today)).toEqual({ min: '2026-03-07', max: '2026-03-13' });
  });

  it('cadran "passé" se termine à aujourd\'hui', () => {
    const node: CalendrierNodeData = { type: 'calendrier', audio: baseAudio('c'), periode: 5, cadran: 'passé', set: 'date', next: 'x' };
    expect(computeCalendarWindow(node, today)).toEqual({ min: '2026-03-06', max: '2026-03-10' });
  });

  it('cadran "future" démarre à aujourd\'hui', () => {
    const node: CalendrierNodeData = { type: 'calendrier', audio: baseAudio('c'), periode: 5, cadran: 'future', set: 'date', next: 'x' };
    expect(computeCalendarWindow(node, today)).toEqual({ min: '2026-03-10', max: '2026-03-14' });
  });
});

describe('resolveStep — dispatch par type', () => {
  it('retourne les options pour un nœud grid', () => {
    const flow = buildFlow();
    const res = resolveStep(flow, 'grid_produit', createInitialContext());
    expect(res.type).toBe('grid');
  });

  it('retourne "unknown" pour un id de nœud inexistant', () => {
    const flow = buildFlow();
    const res = resolveStep(flow, 'nope', createInitialContext());
    expect(res.type).toBe('unknown');
  });

  it('retourne "result" pour un nœud terminal', () => {
    const flow = buildFlow();
    const res = resolveStep(flow, 'result_1', createInitialContext());
    expect(res.type).toBe('result');
  });
});

describe('advance — progression de la navigation', () => {
  it('un nœud root ne stocke rien mais calcule le nœud suivant', () => {
    const flow = buildFlow();
    const res = advance(flow, 'root', createInitialContext(), 'achat');
    expect(res.error).toBeUndefined();
    expect(res.nextNodeId).toBe('grid_produit');
    expect(res.context.values).toEqual({});
  });

  it('un nœud grid stocke la valeur sous son "set"', () => {
    const flow = buildFlow();
    const res = advance(flow, 'grid_produit', createInitialContext(), 'riz');
    expect(res.context.values).toEqual({ produit: 'riz' });
    expect(res.nextNodeId).toBe('result_1');
  });

  it('signale une erreur si le "set" est vide sur un nœud grid', () => {
    const flow = buildFlow();
    (flow.nodes.grid_produit as GridNodeData).set = '';
    const res = advance(flow, 'grid_produit', createInitialContext(), 'riz');
    expect(res.error).toContain('"set"');
    expect(res.context.values).toEqual({});
  });

  it('signale une erreur si l\'option root choisie est introuvable', () => {
    const flow = buildFlow();
    const res = advance(flow, 'root', createInitialContext(), 'inexistant');
    expect(res.error).toContain('inexistant');
  });

  it("signale une erreur si le nœud n'est pas un nœud de navigation (ex. result)", () => {
    const flow = buildFlow();
    const res = advance(flow, 'result_1', createInitialContext(), 'x');
    expect(res.error).toContain('result_1');
  });
});

describe('nœud result — paramètres manquants et requête', () => {
  const resultNode: ResultNodeData = {
    type: 'result',
    audio: baseAudio('r'),
    data_source: { endpoint: 'api/app/acheter_produit', method: 'POST', params: ['produit', 'departement'] }
  };

  it('computeMissingParams liste les params jamais collectés', () => {
    const context: SimulationContext = { values: { produit: 'mais' }, history: [] };
    expect(computeMissingParams(resultNode, context)).toEqual(['departement']);
  });

  it('buildRequest construit URL/méthode/headers/body à partir du contexte', () => {
    const context: SimulationContext = { values: { produit: 'mais', departement: 'oueme' }, history: [] };
    const req = buildRequest('https://api.exemple.com/', 'secret', resultNode, context);
    expect(req.url).toBe('https://api.exemple.com/api/app/acheter_produit');
    expect(req.method).toBe('POST');
    expect(req.headers.Authorization).toBe('Bearer secret');
    expect(req.body).toEqual({ produit: 'mais', departement: 'oueme' });
    expect(req.missingParams).toEqual([]);
  });

  it("buildRequest omet l'en-tête Authorization sans token", () => {
    const context: SimulationContext = { values: {}, history: [] };
    const req = buildRequest('https://api.exemple.com', undefined, resultNode, context);
    expect(req.headers.Authorization).toBeUndefined();
    expect(req.missingParams).toEqual(['produit', 'departement']);
  });

  it('buildRequest utilise la méthode par défaut si absente', () => {
    const node: ResultNodeData = { type: 'result', audio: baseAudio('r2'), data_source: { endpoint: 'api/x', params: [] } };
    const req = buildRequest('https://api.exemple.com', undefined, node, { values: {}, history: [] });
    expect(req.method).toBe('POST');
  });
});

describe('repli simulé — substitution de placeholders', () => {
  it('remplace les {param} connus et laisse les autres tels quels', () => {
    const { result, unresolved } = substitutePlaceholders('{"produit":"{produit}","x":"{inconnu}"}', { produit: 'mais' });
    expect(result).toBe('{"produit":"mais","x":"{inconnu}"}');
    expect(unresolved).toEqual(['inconnu']);
  });

  it('utilise la valeur par défaut de {param:defaut} quand le param est inconnu', () => {
    const { result, unresolved } = substitutePlaceholders('{"date":"{date:2026-03-10}","prix":"{prix:1000}"}', {});
    expect(result).toBe('{"date":"2026-03-10","prix":"1000"}');
    expect(unresolved).toEqual([]);
  });

  it('préfère la valeur réellement collectée au défaut de {param:defaut}', () => {
    const { result } = substitutePlaceholders('{"date":"{date:2026-03-10}"}', { date: '2026-07-11' });
    expect(result).toBe('{"date":"2026-07-11"}');
  });
});

describe('repli simulé — buildMockResponse', () => {
  it('utilise response_examples en priorité (index choisi)', () => {
    const node: ResultNodeData = {
      type: 'result',
      audio: baseAudio('r'),
      data_source: { endpoint: 'api/x', params: [] },
      json_response_contrat: '{"from":"contrat"}',
      response_examples: ['{"from":"ex0"}', '{"from":"ex1"}']
    };
    const res = buildMockResponse(node, { values: {}, history: [] }, 1);
    expect(res.source).toBe('response_examples');
    expect(res.json).toBe('{"from":"ex1"}');
  });

  it('retombe sur json_response_contrat si response_examples est vide', () => {
    const node: ResultNodeData = {
      type: 'result',
      audio: baseAudio('r'),
      data_source: { endpoint: 'api/x', params: [] },
      json_response_contrat: '{"from":"{source}"}'
    };
    const res = buildMockResponse(node, { values: { source: 'contrat' }, history: [] });
    expect(res.source).toBe('json_response_contrat');
    expect(res.json).toBe('{"from":"contrat"}');
  });

  it('retourne "none" si rien de non-trivial n\'est disponible', () => {
    const node: ResultNodeData = { type: 'result', audio: baseAudio('r'), data_source: { endpoint: 'api/x', params: [] }, json_response_contrat: '{}' };
    const res = buildMockResponse(node, { values: {}, history: [] });
    expect(res.source).toBe('none');
    expect(res.json).toBe('{}');
  });
});

describe('détection de l\'enveloppe audio_sequence', () => {
  it('reconnaît une enveloppe valide et extrait ses blocs + pause_ms', () => {
    const json = JSON.stringify({
      type: 'audio_sequence',
      sequence: [{ audios: ['a.mp3', 'b.mp3'], image: 'img.png' }, { audios: ['c.mp3'] }],
      meta: { pause_ms: 600 }
    });
    const parsed = parseAudioSequence(json);
    expect(parsed?.sequence).toEqual([
      { audios: ['a.mp3', 'b.mp3'], image: 'img.png' },
      { audios: ['c.mp3'], image: null }
    ]);
    expect(parsed?.pauseMs).toBe(600);
  });

  it('retourne null pour un JSON invalide', () => {
    expect(parseAudioSequence('{ invalide')).toBeNull();
  });

  it('retourne null pour une réponse dont le type n\'est pas audio_sequence', () => {
    expect(parseAudioSequence('{"type":"calendar","data":{}}')).toBeNull();
  });

  it('retourne null si sequence est absent ou n\'est pas un tableau', () => {
    expect(parseAudioSequence('{"type":"audio_sequence"}')).toBeNull();
    expect(parseAudioSequence('{"type":"audio_sequence","sequence":"pas un tableau"}')).toBeNull();
  });
});
