export const createDefaultRootNode = (id: string) => ({
  type: "root",
  audio_prompt: `intro/${id}.mp3`,
  options: []
});

export const createDefaultGridNode = (id: string) => ({
  type: "grid",
  audio_prompt: `questions/${id}.mp3`,
  options_source: "",
  set: "",
  next: ""
});

export const createDefaultResultNode = (id: string) => ({
  type: "result",
  data_source: {
    endpoint: "",
    params: []
  },
  audio_sequence: []
});

export const createDefaultCalendrierNode = (id: string) => ({
  type: "calendrier",
  audio_prompt: `questions/date_${id}.mp3`,
  periode: 7,
  cadran: "centrer",
  next: ""
});

export const createDefaultMenuNode = (id: string, level: number = 2) => ({
  id,
  level,
  type: "menu",
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
