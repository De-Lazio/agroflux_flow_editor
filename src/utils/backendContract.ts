import { DEFAULT_HTTP_METHOD } from '../types/flow';
import type { FlowData, HttpMethod, ResultNodeData } from '../types/flow';

export interface BackendEndpoint {
  endpoint: string;
  method: HttpMethod;
  params: string[];
  response_example?: string;
  json_response_contrat?: string;
  used_by_nodes: string[];
}

export interface BackendContract {
  generated_at: string;
  endpoints: BackendEndpoint[];
}

// Un "{}" (ou vide) ne documente rien de plus qu'un champ non renseigné —
// on ne le retient pas comme exemple de réponse dans le contrat.
const firstNonTrivialJson = (values: (string | undefined)[]): string | undefined =>
  values.find((value) => !!value && value.trim() !== '' && value.trim() !== '{}');

/**
 * Dérive, à partir des nœuds `result` du flow, la liste des routes backend à
 * implémenter (endpoint + méthode + params + exemple de réponse), regroupées
 * par couple (endpoint, méthode). Se régénère entièrement à chaque appel :
 * ajouter ou modifier une branche du flow met le contrat à jour sans étape
 * manuelle (voir PLAN_STUDIO.md, Phase 2.4).
 */
export const buildBackendContract = (flow: FlowData): BackendContract => {
  const endpoints = new Map<string, BackendEndpoint>();

  Object.entries(flow.nodes).forEach(([id, node]) => {
    if (node.type !== 'result') return;
    const { data_source, response_examples } = node as ResultNodeData;
    if (!data_source?.endpoint) return;

    const method = data_source.method || DEFAULT_HTTP_METHOD;
    const key = `${method} ${data_source.endpoint}`;
    const responseExample = firstNonTrivialJson(response_examples || []);
    const jsonResponseContrat = firstNonTrivialJson([node.json_response_contrat]);

    const existing = endpoints.get(key);
    if (!existing) {
      endpoints.set(key, {
        endpoint: data_source.endpoint,
        method,
        params: [...(data_source.params || [])],
        response_example: responseExample,
        json_response_contrat: jsonResponseContrat,
        used_by_nodes: [id]
      });
      return;
    }

    (data_source.params || []).forEach((param) => {
      if (!existing.params.includes(param)) existing.params.push(param);
    });
    existing.used_by_nodes.push(id);
    if (!existing.response_example) existing.response_example = responseExample;
    if (!existing.json_response_contrat) existing.json_response_contrat = jsonResponseContrat;
  });

  return {
    generated_at: new Date().toISOString(),
    endpoints: [...endpoints.values()].sort(
      (a, b) => a.endpoint.localeCompare(b.endpoint) || a.method.localeCompare(b.method)
    )
  };
};

// Un backtick littéral dans le contenu casserait le span de code inline
// (`` `...` ``) qui l'entoure dans le tableau — CommonMark n'a pas d'échappement
// backslash valide à l'intérieur d'un code span, donc on le remplace plutôt que
// de l'échapper.
const escapeMarkdownCell = (value: string): string =>
  value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').replace(/`/g, "'");

export const exportBackendContractAsJson = (contract: BackendContract): string =>
  JSON.stringify(contract, null, 2);

export const exportBackendContractAsMarkdown = (contract: BackendContract): string => {
  const rows = contract.endpoints.map((ep) => {
    const example = ep.response_example || ep.json_response_contrat || '';
    const params = ep.params.length > 0 ? ep.params.join(', ') : '—';
    const exampleCell = example ? `\`${escapeMarkdownCell(example)}\`` : '—';
    return `| \`${escapeMarkdownCell(ep.endpoint)}\` | ${ep.method} | ${params} | ${exampleCell} |`;
  });

  return [
    '# Contrat Backend — Routes à implémenter',
    '',
    `Généré le ${contract.generated_at}`,
    '',
    '| Endpoint | Méthode | Params | Exemple de réponse |',
    '|---|---|---|---|',
    ...(rows.length > 0 ? rows : ['| _Aucune route_ | — | — | — |']),
    ''
  ].join('\n');
};
