// Schéma du flow AgroFlux (format "dynamic" unique). Un FlowNodeData est une
// union discriminée sur `type` : chaque type de nœud n'a que les champs qui
// ont un sens pour lui (voir context.md pour la description fonctionnelle).

export interface AudioSequence {
  type: 'sequence';
  key: string;
  sequence: string[];
  fallback: string;
}

export interface RootOption {
  id: string;
  next: string;
}

export interface DataSource {
  endpoint: string;
  params: string[];
}

interface BaseNodeData {
  comment?: string;
  json_response_contrat?: string;
  audio?: AudioSequence;
}

export interface RootNodeData extends BaseNodeData {
  type: 'root';
  options: RootOption[];
}

export interface GridNodeData extends BaseNodeData {
  type: 'grid';
  options_source: string;
  set: string;
  next: string;
}

export interface ResultNodeData extends BaseNodeData {
  type: 'result';
  data_source: DataSource;
  response_examples?: string[];
}

export interface CalendrierNodeData extends BaseNodeData {
  type: 'calendrier';
  periode: number;
  cadran: string;
  next: string;
}

export interface PreFilterNodeData extends BaseNodeData {
  type: 'pre_filter';
  cle: string;
  filtre_source: string;
  next: string;
}

export type FlowNodeType = 'root' | 'grid' | 'result' | 'calendrier' | 'pre_filter';

export type FlowNodeData =
  | RootNodeData
  | GridNodeData
  | ResultNodeData
  | CalendrierNodeData
  | PreFilterNodeData;

// Forme stockée dans le `data` d'un nœud ReactFlow : le node du schéma + son id.
export type FlowGraphNodeData = FlowNodeData & { id: string };

export type FlowNodes = Record<string, FlowNodeData>;

export interface AudioConfig {
  auto_play_prompt: boolean;
  auto_play_option: boolean;
  pause_between_ms: number;
}

export interface FlowConfig {
  audio: AudioConfig;
}

export interface ResourceFormats {
  audio: string;
  image: string;
}

export type FlowVariables = Record<string, string[]>;
export type FlowHashmaps = Record<string, Record<string, string[]>>;
export type FlowMappings = Record<string, string>;

export interface FlowData {
  version: string;
  entry: string;
  config?: FlowConfig;
  variables: FlowVariables;
  hashmaps: FlowHashmaps;
  audio_mappings: FlowMappings;
  resource_formats?: ResourceFormats;
  dynamic_audio?: Record<string, unknown>;
  nodes: FlowNodes;
}

// Vue permissive utilisée par le validator pour sonder les champs propres à
// un seul type de nœud (options_source, next, ...) sans écrire un type guard
// par champ : la donnée entrante peut être imparfaite (JSON importé, pas
// encore validé), c'est justement le rôle du validator de le détecter.
export interface FlowNodeProbe {
  options_source?: string;
  set?: string;
  cle?: string;
  filtre_source?: string;
  options?: RootOption[];
  next?: string;
  response_examples?: string[];
}

export interface ResourceGroup {
  audios: string[];
  images: string[];
}

export interface ValidationReport {
  audios: string[];
  images: string[];
  variables: string[];
  variableResources: ResourceGroup;
  hashmapResources: ResourceGroup;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  report: ValidationReport;
}
