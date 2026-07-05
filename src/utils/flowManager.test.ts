import { describe, it, expect } from 'vitest';
import { jsonToFlow, flowToJson } from './flowManager';

const sampleFlow = {
  version: '1.0',
  entry: 'root',
  nodes: {
    root: {
      type: 'root',
      audio: { type: 'sequence', key: 'root_intro', sequence: ['intro/root.mp3'], fallback: 'intro/default.mp3' },
      options: [{ id: 'go', next: 'grid_1' }],
      comment: ''
    },
    grid_1: {
      type: 'grid',
      audio: { type: 'sequence', key: 'grid_1_intro', sequence: ['questions/grid_1.mp3'], fallback: 'intro/default.mp3' },
      options_source: 'produits',
      set: 'produits',
      next: 'result_1',
      comment: ''
    },
    result_1: {
      type: 'result',
      audio: { type: 'sequence', key: 'result_1_intro', sequence: ['intro/result_1.mp3'], fallback: 'intro/default.mp3' },
      data_source: { endpoint: 'api/x', params: ['produit'] },
      comment: ''
    }
  }
};

describe('jsonToFlow', () => {
  it('crée un nœud par entrée de flowData.nodes', () => {
    const { nodes } = jsonToFlow(sampleFlow);
    expect(nodes.map((n) => n.id).sort()).toEqual(['grid_1', 'result_1', 'root']);
  });

  it('crée une arête par option du nœud root', () => {
    const { edges } = jsonToFlow(sampleFlow);
    const rootEdge = edges.find((e) => e.source === 'root');
    expect(rootEdge?.target).toBe('grid_1');
  });

  it('crée une arête à partir du champ next pour les nœuds non-root', () => {
    const { edges } = jsonToFlow(sampleFlow);
    const gridEdge = edges.find((e) => e.source === 'grid_1');
    expect(gridEdge?.target).toBe('result_1');
  });

  it('ne crée aucune arête pour un nœud result sans next', () => {
    const { edges } = jsonToFlow(sampleFlow);
    const resultEdge = edges.find((e) => e.source === 'result_1');
    expect(resultEdge).toBeUndefined();
  });
});

describe('flowToJson', () => {
  it('reconstruit un objet nodes fidèle à partir des données du graphe', () => {
    const { nodes } = jsonToFlow(sampleFlow);
    const rebuilt = flowToJson(nodes, { entry: 'root' });

    expect(Object.keys(rebuilt.nodes).sort()).toEqual(['grid_1', 'result_1', 'root']);
    expect(rebuilt.nodes.grid_1.options_source).toBe('produits');
    expect(rebuilt.nodes.root.options[0].next).toBe('grid_1');
  });

  it("retire le champ id injecté par jsonToFlow (il ne doit pas polluer le node.data exporté)", () => {
    const { nodes } = jsonToFlow(sampleFlow);
    const rebuilt = flowToJson(nodes, {});
    expect(rebuilt.nodes.root.id).toBeUndefined();
  });

  it('retombe sur le premier nœud comme entry si aucun entry explicite n\'est fourni', () => {
    const { nodes } = jsonToFlow(sampleFlow);
    const rebuilt = flowToJson(nodes, {});
    expect(rebuilt.entry).toBe(Object.keys(rebuilt.nodes)[0]);
  });

  it('inclut les formats de ressources par défaut si non précisés', () => {
    const { nodes } = jsonToFlow(sampleFlow);
    const rebuilt = flowToJson(nodes, {});
    expect(rebuilt.resource_formats).toEqual({ audio: 'mp3', image: 'jpeg' });
  });

  it('propage les formats de ressources personnalisés', () => {
    const { nodes } = jsonToFlow(sampleFlow);
    const rebuilt = flowToJson(nodes, { resource_formats: { audio: 'wav', image: 'png' } });
    expect(rebuilt.resource_formats).toEqual({ audio: 'wav', image: 'png' });
  });
});
