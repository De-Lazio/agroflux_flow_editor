export const createDefaultRootNode = (id: string) => ({
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

export const createDefaultGridNode = (id: string) => ({
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
  json_response_contrat: "{}",
  comment: ""
});

export const createDefaultResultNode = (id: string) => ({
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

export const createDefaultCalendrierNode = (id: string) => ({
  id,
  type: 'calendrier',
  audio: {
    type: "sequence",
    key: `${id}_intro`,
    sequence: ['questions/date.mp3'],
    fallback: "intro/default.mp3"
  },
  periode: 7,
  cadran: 'centrer',
  next: '',
  json_response_contrat: "{}",
  comment: ""
});

export const createDefaultPreFilterNode = (id: string) => ({
  id,
  type: 'pre_filter',
  audio: {
    type: "sequence",
    key: `${id}_intro`,
    sequence: ['questions/filtre.mp3'],
    fallback: "intro/default.mp3"
  },
  cle: '',
  filtre_source: '',
  next: '',
  json_response_contrat: "{}",
  comment: ""
});


export const createDefaultMenuNode = (id: string, level: number = 2) => ({
  id,
  level,
  type: "menu",
  comment: "",
  audio: {
    context: [],
    auto_play: true
  },
  options: [],
  pagination: {
    items_per_page: 5,
    allow_swipe: true
  },
  voice_filter: {
    enabled: false,
    trigger_threshold: 10
  },
  navigation: {
    show_back: true,
    show_home: true,
    breadcrumb: []
  }
});

export const createDefaultFilterNode = (id: string, level: number = 3) => ({
  id,
  level,
  type: "filter",
  comment: "",
  filter_category: "location",
  filter_step: "",
  audio: {
    context: [],
    auto_play: true
  },
  options: [],
  pagination: {
    items_per_page: 5,
    allow_swipe: true
  },
  voice_filter: {
    enabled: true,
    trigger_threshold: 10
  },
  navigation: {
    show_back: true,
    show_home: true,
    breadcrumb: []
  },
  api: {
    endpoint: "",
    method: "GET",
    params_from_history: true
  },
  next_filter: null
});

export const createDefaultResultsNode = (id: string, level: number = 4) => ({
  id,
  level,
  type: "results",
  comment: "",
  audio: {
    context: [],
    auto_play: true
  },
  options: [],
  pagination: {
    items_per_page: 5,
    allow_swipe: true
  },
  voice_filter: {
    enabled: true,
    trigger_threshold: 10
  },
  navigation: {
    show_back: true,
    show_home: true,
    breadcrumb: []
  },
  api: {
    endpoint: "/search/results",
    method: "POST",
    params_from_history: true
  }
});

export const createDefaultWidgetNode = (id: string, level: number = 3) => ({
  id,
  level,
  type: "widget",
  comment: "",
  widget_type: "calendar",
  audio: {
    context: [],
    auto_play: true
  },
  options: [],
  pagination: {
    items_per_page: 5,
    allow_swipe: false
  },
  voice_filter: {
    enabled: false,
    trigger_threshold: 10
  },
  navigation: {
    show_back: true,
    show_home: true,
    breadcrumb: []
  }
});

