import type { RootNodeData, GridNodeData, ResultNodeData, CalendrierNodeData, PreFilterNodeData } from '../types/flow';

export const createDefaultRootNode = (id: string): RootNodeData => ({
  type: "root",
  audio: {
    type: "sequence",
    key: `${id}_intro`,
    sequence: [`intro/${id}.mp3`],
    fallback: "intro/default.mp3"
  },
  options: [],
  json_response_contrat: "{}",
  comment: ""
});

export const createDefaultGridNode = (id: string): GridNodeData => ({
  type: "grid",
  audio: {
    type: "sequence",
    key: `${id}_intro`,
    sequence: [`questions/${id}.mp3`],
    fallback: "intro/default.mp3"
  },
  options_source: "",
  set: "",
  next: "",
  can_choix_all: false,
  controle_active: false,
  json_response_contrat: "{}",
  comment: ""
});

export const createDefaultResultNode = (id: string): ResultNodeData => ({
  type: "result",
  data_source: {
    endpoint: "",
    params: []
  },
  audio: {
    type: "sequence",
    key: `${id}_intro`,
    sequence: [`questions/${id}.mp3`],
    fallback: "intro/default.mp3"
  },
  json_response_contrat: "{}",
  response_examples: [],
  comment: ""
});

export const createDefaultCalendrierNode = (id: string): CalendrierNodeData => ({
  type: 'calendrier',
  audio: {
    type: "sequence",
    key: `${id}_intro`,
    sequence: ['questions/date.mp3'],
    fallback: "intro/default.mp3"
  },
  periode: 7,
  cadran: 'centrer',
  set: '',
  next: '',
  json_response_contrat: "{}",
  comment: ""
});

export const createDefaultPreFilterNode = (id: string): PreFilterNodeData => ({
  type: 'pre_filter',
  audio: {
    type: "sequence",
    key: `${id}_intro`,
    sequence: ['questions/filtre.mp3'],
    fallback: "intro/default.mp3"
  },
  cle: '',
  filtre_source: '',
  set: '',
  next: '',
  can_choix_all: false,
  controle_active: false,
  json_response_contrat: "{}",
  comment: ""
});
