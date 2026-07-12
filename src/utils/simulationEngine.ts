// Logique pure du Simulateur de Flow (voir simulation_plan.md) : résolution
// des options par type de nœud, gestion du contexte de navigation,
// construction de la requête API et repli simulé, détection de l'enveloppe
// de réponse "audio_sequence". Aucune dépendance React ni accès disque/réseau
// ici — l'orchestration (SimulatorPanel) et la résolution de ressources sur
// disque (Phase 3) restent des couches séparées.

import { DEFAULT_HTTP_METHOD } from '../types/flow';
import type {
  FlowData,
  FlowNodeData,
  HttpMethod,
  ResultNodeData
} from '../types/flow';

// ---------------------------------------------------------------------------
// Contexte de navigation
// ---------------------------------------------------------------------------

export interface SimulationStep {
  nodeId: string;
  paramName?: string;
  value?: string;
}

export interface SimulationContext {
  values: Record<string, string>;
  history: SimulationStep[];
}

export const createInitialContext = (): SimulationContext => ({ values: {}, history: [] });

const applyChoice = (
  context: SimulationContext,
  nodeId: string,
  paramName: string | undefined,
  value: string | undefined
): SimulationContext => ({
  values: paramName && value !== undefined ? { ...context.values, [paramName]: value } : context.values,
  history: [...context.history, { nodeId, paramName, value }]
});

// Revient à l'état du contexte juste avant l'étape d'index `index` de
// l'historique — recalcule `values` en rejouant l'historique tronqué plutôt
// que de garder une pile de snapshots : plus simple, et l'historique est de
// toute façon déjà la source de vérité affichée dans le fil d'Ariane.
// `index <= 0` revient à l'état initial (avant toute étape).
export const jumpToStep = (context: SimulationContext, index: number): SimulationContext => {
  const history = context.history.slice(0, Math.max(0, index));
  const values: Record<string, string> = {};
  history.forEach((step) => {
    if (step.paramName && step.value !== undefined) values[step.paramName] = step.value;
  });
  return { values, history };
};

export const stepBack = (context: SimulationContext): SimulationContext =>
  context.history.length === 0 ? context : jumpToStep(context, context.history.length - 1);

// ---------------------------------------------------------------------------
// Résolution des options par type de nœud (voir simulation_plan.md §3.2)
// ---------------------------------------------------------------------------

export interface SimulationOption {
  value: string;
  label: string;
}

// Aucune convention n'existe dans flow.json ni ailleurs dans le codebase pour
// la valeur produite par un choix "Tout" (can_choix_all n'est activé sur
// aucun nœud du flow actuel) — "tout" est un choix par défaut lisible, à
// ajuster le jour où une vraie convention backend/mobile est fixée.
export const ALL_OPTION_VALUE = 'tout';
const ALL_OPTION_LABEL = 'Tout';

export const resolveRootOptions = (node: Extract<FlowNodeData, { type: 'root' }>): SimulationOption[] =>
  (node.options || []).map((opt) => ({ value: opt.id, label: opt.id }));

export const resolveGridOptions = (
  node: Extract<FlowNodeData, { type: 'grid' }>,
  flow: FlowData
): SimulationOption[] => {
  const values = flow.variables?.[node.options_source] || [];
  const inactive = new Set(
    node.controle_active ? flow.active_overrides?.variables?.[node.options_source] || [] : []
  );
  const options = values.filter((v) => !inactive.has(v)).map((v) => ({ value: v, label: v }));
  if (node.can_choix_all) options.unshift({ value: ALL_OPTION_VALUE, label: ALL_OPTION_LABEL });
  return options;
};

export interface PreFilterResolution {
  options: SimulationOption[];
  error?: string;
  warning?: string;
}

export const resolvePreFilterOptions = (
  node: Extract<FlowNodeData, { type: 'pre_filter' }>,
  flow: FlowData,
  context: SimulationContext
): PreFilterResolution => {
  const keyValue = context.values[node.cle];
  if (!keyValue) {
    return {
      options: [],
      error: `Paramètre "${node.cle}" jamais collecté en amont : impossible de filtrer "${node.filtre_source}".`
    };
  }

  const hashmap = flow.hashmaps?.[node.filtre_source] || {};
  const override = node.controle_active ? flow.active_overrides?.hashmaps?.[node.filtre_source] : undefined;

  if (override?.inactive_keys?.includes(keyValue)) {
    return { options: [], warning: `La clé "${keyValue}" est désactivée dans le hashmap "${node.filtre_source}".` };
  }

  const inactiveValues = new Set(override?.inactive_values?.[keyValue] || []);
  const values = (hashmap[keyValue] || []).filter((v) => !inactiveValues.has(v));
  const options = values.map((v) => ({ value: v, label: v }));
  if (node.can_choix_all) options.unshift({ value: ALL_OPTION_VALUE, label: ALL_OPTION_LABEL });

  if (options.length === 0) {
    return { options, warning: `Aucune valeur trouvée pour la clé "${keyValue}" dans le hashmap "${node.filtre_source}" (trou de données probable).` };
  }
  return { options };
};

export interface CalendarWindow {
  min: string;
  max: string;
}

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const computeCalendarWindow = (
  node: Extract<FlowNodeData, { type: 'calendrier' }>,
  today: Date = new Date()
): CalendarWindow => {
  const periode = Math.max(1, node.periode || 1);
  if (node.cadran === 'passé') {
    return { min: toIsoDate(addDays(today, -(periode - 1))), max: toIsoDate(today) };
  }
  if (node.cadran === 'future') {
    return { min: toIsoDate(today), max: toIsoDate(addDays(today, periode - 1)) };
  }
  // "centrer" : périodes paires -> un jour de plus après aujourd'hui qu'avant
  // (pas de jour "0.5"), choix arbitraire mais déterministe.
  const before = Math.floor((periode - 1) / 2);
  const after = periode - 1 - before;
  return { min: toIsoDate(addDays(today, -before)), max: toIsoDate(addDays(today, after)) };
};

export type NodeResolution =
  | { type: 'root'; options: SimulationOption[] }
  | { type: 'grid'; options: SimulationOption[] }
  | { type: 'pre_filter'; options: SimulationOption[]; warning?: string; error?: string }
  | { type: 'calendrier'; window: CalendarWindow }
  | { type: 'result' }
  | { type: 'unknown'; message: string };

export const resolveStep = (
  flow: FlowData,
  nodeId: string,
  context: SimulationContext
): NodeResolution => {
  const node = flow.nodes?.[nodeId];
  if (!node) return { type: 'unknown', message: `Nœud "${nodeId}" introuvable.` };

  switch (node.type) {
    case 'root':
      return { type: 'root', options: resolveRootOptions(node) };
    case 'grid':
      return { type: 'grid', options: resolveGridOptions(node, flow) };
    case 'pre_filter': {
      const res = resolvePreFilterOptions(node, flow, context);
      return { type: 'pre_filter', options: res.options, warning: res.warning, error: res.error };
    }
    case 'calendrier':
      return { type: 'calendrier', window: computeCalendarWindow(node) };
    case 'result':
      return { type: 'result' };
    default:
      return { type: 'unknown', message: `Type de nœud non reconnu.` };
  }
};

export interface AdvanceResult {
  context: SimulationContext;
  nextNodeId?: string;
  error?: string;
}

// Applique le choix du testeur (option root, valeur grid/pre_filter, date
// calendrier) et calcule le nœud suivant — la seule opération qui fait
// progresser la navigation d'une étape.
export const advance = (
  flow: FlowData,
  nodeId: string,
  context: SimulationContext,
  chosenValue: string
): AdvanceResult => {
  const node = flow.nodes?.[nodeId];
  if (!node) return { context, error: `Nœud "${nodeId}" introuvable.` };

  if (node.type === 'root') {
    const option = node.options?.find((o) => o.id === chosenValue);
    if (!option) return { context, error: `Option "${chosenValue}" introuvable sur le nœud root "${nodeId}".` };
    return { context: applyChoice(context, nodeId, undefined, undefined), nextNodeId: option.next };
  }

  if (node.type === 'grid' || node.type === 'pre_filter' || node.type === 'calendrier') {
    if (!node.set) {
      return { context, error: `Nœud "${nodeId}" (${node.type}) : le champ "set" est vide, impossible de stocker la valeur choisie.` };
    }
    return { context: applyChoice(context, nodeId, node.set, chosenValue), nextNodeId: node.next };
  }

  return { context, error: `Le nœud "${nodeId}" (${node.type}) n'est pas un nœud de navigation.` };
};

// ---------------------------------------------------------------------------
// Nœud "result" : requête API et repli simulé (voir simulation_plan.md §5)
// ---------------------------------------------------------------------------

export const computeMissingParams = (node: ResultNodeData, context: SimulationContext): string[] =>
  (node.data_source?.params || []).filter((p) => !(p in context.values));

export interface SimulatedRequest {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: Record<string, string>;
  missingParams: string[];
}

export const buildRequest = (
  baseUrl: string,
  token: string | undefined,
  node: ResultNodeData,
  context: SimulationContext
): SimulatedRequest => {
  const method = node.data_source?.method || DEFAULT_HTTP_METHOD;
  const params = node.data_source?.params || [];
  const missingParams = computeMissingParams(node, context);

  const body: Record<string, string> = {};
  params.forEach((p) => {
    if (p in context.values) body[p] = context.values[p];
  });

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = (node.data_source?.endpoint || '').replace(/^\/+/, '');
  const url = cleanEndpoint ? `${cleanBase}/${cleanEndpoint}` : cleanBase;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && token.trim()) headers.Authorization = `Bearer ${token.trim()}`;

  return { url, method, headers, body, missingParams };
};

const isNonTrivialJson = (value: string | undefined): value is string =>
  !!value && value.trim() !== '' && value.trim() !== '{}';

// {param} ou {param:defaut} — même convention que la séquence audio d'un
// nœud (voir AudioSequenceEditor dans NodeEditor.tsx et le regex équivalent
// de validator.ts) : la valeur par défaut sert d'illustration quand aucune
// valeur réelle n'a été collectée sur ce chemin.
const PLACEHOLDER_RE = /\{(\w+)(?::([^}]*))?\}/g;

// Substitue les {param}/{param:defaut} d'un contrat/exemple par les valeurs
// réellement collectées (ou, à défaut, la valeur par défaut du placeholder) ;
// un placeholder sans valeur connue NI défaut reste affiché tel quel (jamais
// silencieusement vidé) pour que le testeur voie ce qui manque.
export const substitutePlaceholders = (
  json: string,
  values: Record<string, string>
): { result: string; unresolved: string[] } => {
  const unresolved = new Set<string>();
  const result = json.replace(PLACEHOLDER_RE, (match, key, defaultValue) => {
    if (key in values) return values[key];
    if (defaultValue !== undefined) return defaultValue;
    unresolved.add(key);
    return match;
  });
  return { result, unresolved: [...unresolved] };
};

export type MockResponseSource = 'response_examples' | 'json_response_contrat' | 'none';

export interface MockResponse {
  json: string;
  unresolved: string[];
  source: MockResponseSource;
}

// Repli simulé (§5.2) : quand plusieurs response_examples existent, le
// testeur choisit lequel prévisualiser (exampleIndex) plutôt qu'une
// correspondance automatique par contenu, jugée trop fragile pour la valeur
// ajoutée (voir simulation_plan.md).
export const buildMockResponse = (
  node: ResultNodeData,
  context: SimulationContext,
  exampleIndex = 0
): MockResponse => {
  const examples = (node.response_examples || []).filter(isNonTrivialJson);

  let raw: string | undefined;
  let source: MockResponseSource = 'none';

  if (examples.length > 0) {
    raw = examples[exampleIndex] ?? examples[0];
    source = 'response_examples';
  } else if (isNonTrivialJson(node.json_response_contrat)) {
    raw = node.json_response_contrat;
    source = 'json_response_contrat';
  }

  if (!raw) return { json: '{}', unresolved: [], source: 'none' };

  const { result, unresolved } = substitutePlaceholders(raw, context.values);
  return { json: result, unresolved, source };
};

// ---------------------------------------------------------------------------
// Détection de l'enveloppe de réponse "audio_sequence" (§5.3)
// ---------------------------------------------------------------------------

export interface AudioSequenceBlock {
  audios: string[];
  image: string | null;
}

export interface AudioSequenceEnvelope {
  type: 'audio_sequence';
  sequence: AudioSequenceBlock[];
  pauseMs?: number;
}

// Parse défensif : une réponse (réelle ou simulée) hors de ce format doit
// juste échouer à matcher (retour null), jamais lever — l'appelant décide
// alors d'afficher le JSON brut plutôt que de tenter une lecture audio.
export const parseAudioSequence = (json: string): AudioSequenceEnvelope | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as Record<string, unknown>).type !== 'audio_sequence' ||
    !Array.isArray((parsed as Record<string, unknown>).sequence)
  ) {
    return null;
  }

  const rawSequence = (parsed as { sequence: unknown[] }).sequence;
  const sequence: AudioSequenceBlock[] = rawSequence
    .filter((block): block is Record<string, unknown> => !!block && typeof block === 'object' && Array.isArray((block as Record<string, unknown>).audios))
    .map((block) => ({
      audios: block.audios as string[],
      image: (block.image as string | null | undefined) ?? null
    }));

  const meta = (parsed as Record<string, unknown>).meta as Record<string, unknown> | undefined;
  const pauseMs = typeof meta?.pause_ms === 'number' ? (meta.pause_ms as number) : undefined;

  return { type: 'audio_sequence', sequence, pauseMs };
};
