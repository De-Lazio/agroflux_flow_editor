import { describe, it, expect } from 'vitest';
import { buildBackendContract, exportBackendContractAsMarkdown } from './backendContract';
import type { FlowData } from '../types/flow';

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
  nodes: {},
  ...overrides
});

describe('buildBackendContract', () => {
  it('extrait un endpoint par nœud result, avec sa méthode (POST par défaut si absente)', () => {
    const flow = buildFlow({
      nodes: {
        result_1: {
          type: 'result',
          audio: baseAudio('result_1'),
          data_source: { endpoint: 'api/app/acheter_produit', params: ['produit', 'departement'] }
        }
      }
    });

    const contract = buildBackendContract(flow);
    expect(contract.endpoints).toEqual([
      {
        endpoint: 'api/app/acheter_produit',
        method: 'POST',
        params: ['produit', 'departement'],
        response_example: undefined,
        json_response_contrat: undefined,
        used_by_nodes: ['result_1']
      }
    ]);
  });

  it('respecte la méthode explicite d\'un nœud result', () => {
    const flow = buildFlow({
      nodes: {
        result_1: {
          type: 'result',
          audio: baseAudio('result_1'),
          data_source: { endpoint: 'api/app/infos_marche', params: ['marche'], method: 'GET' }
        }
      }
    });

    const contract = buildBackendContract(flow);
    expect(contract.endpoints[0].method).toBe('GET');
  });

  it('regroupe deux nœuds result partageant le même (endpoint, méthode) et fait l\'union des params', () => {
    const flow = buildFlow({
      nodes: {
        result_1: {
          type: 'result',
          audio: baseAudio('result_1'),
          data_source: { endpoint: 'api/app/x', params: ['produit'] }
        },
        result_2: {
          type: 'result',
          audio: baseAudio('result_2'),
          data_source: { endpoint: 'api/app/x', params: ['produit', 'departement'] }
        }
      }
    });

    const contract = buildBackendContract(flow);
    expect(contract.endpoints).toHaveLength(1);
    expect(contract.endpoints[0].params).toEqual(['produit', 'departement']);
    expect(contract.endpoints[0].used_by_nodes.sort()).toEqual(['result_1', 'result_2']);
  });

  it('traite le même endpoint utilisé avec deux méthodes différentes comme deux routes distinctes', () => {
    const flow = buildFlow({
      nodes: {
        result_1: {
          type: 'result',
          audio: baseAudio('result_1'),
          data_source: { endpoint: 'api/app/x', params: ['produit'], method: 'GET' }
        },
        result_2: {
          type: 'result',
          audio: baseAudio('result_2'),
          data_source: { endpoint: 'api/app/x', params: ['produit'], method: 'POST' }
        }
      }
    });

    const contract = buildBackendContract(flow);
    expect(contract.endpoints).toHaveLength(2);
    expect(contract.endpoints.map((e) => e.method).sort()).toEqual(['GET', 'POST']);
  });

  it('retient le premier exemple de réponse non trivial ("{}" ne compte pas)', () => {
    const flow = buildFlow({
      nodes: {
        result_1: {
          type: 'result',
          audio: baseAudio('result_1'),
          data_source: { endpoint: 'api/app/x', params: ['produit'] },
          response_examples: ['{}', '{"prix": 500}']
        }
      }
    });

    const contract = buildBackendContract(flow);
    expect(contract.endpoints[0].response_example).toBe('{"prix": 500}');
  });

  it('ignore les nœuds non-result et les result sans endpoint', () => {
    const flow = buildFlow({
      nodes: {
        root: { type: 'root', audio: baseAudio('root'), options: [] },
        result_1: {
          type: 'result',
          audio: baseAudio('result_1'),
          data_source: { endpoint: '', params: [] }
        }
      }
    });

    const contract = buildBackendContract(flow);
    expect(contract.endpoints).toEqual([]);
  });
});

describe('exportBackendContractAsMarkdown', () => {
  it('génère un tableau avec une ligne par endpoint', () => {
    const contract = buildBackendContract(
      buildFlow({
        nodes: {
          result_1: {
            type: 'result',
            audio: baseAudio('result_1'),
            data_source: { endpoint: 'api/app/x', params: ['produit'] }
          }
        }
      })
    );

    const md = exportBackendContractAsMarkdown(contract);
    expect(md).toContain('| Endpoint | Méthode | Params | Exemple de réponse |');
    expect(md).toContain('api/app/x');
    expect(md).toContain('POST');
    expect(md).toContain('produit');
  });

  it('affiche une ligne explicite quand aucune route n\'est trouvée', () => {
    const md = exportBackendContractAsMarkdown(buildBackendContract(buildFlow()));
    expect(md).toContain('Aucune route');
  });

  it('neutralise les backticks et les barres verticales dans l\'exemple de réponse (ne casse pas le tableau Markdown)', () => {
    const contract = buildBackendContract(
      buildFlow({
        nodes: {
          result_1: {
            type: 'result',
            audio: baseAudio('result_1'),
            data_source: { endpoint: 'api/app/x', params: ['produit'] },
            response_examples: ['{"note": "prix en `FCFA` | devise locale"}']
          }
        }
      })
    );

    const md = exportBackendContractAsMarkdown(contract);
    const rows = md.split('\n').filter((line) => line.startsWith('| `api/app/x`'));
    expect(rows).toHaveLength(1);
    // Backtick du contenu neutralisé : il ne doit rester que les 2 paires de backticks
    // délimitant les cellules "endpoint" et "exemple" (4 backticks au total), aucun venant du texte.
    expect((rows[0].match(/`/g) || [])).toHaveLength(4);
    expect(rows[0]).not.toContain('`FCFA`');
    // Barre verticale du contenu échappée, pour ne pas créer une colonne supplémentaire.
    expect(rows[0]).toContain('\\|');
  });
});
