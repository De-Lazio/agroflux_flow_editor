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
