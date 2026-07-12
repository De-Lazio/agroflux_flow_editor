// Persistance de la configuration du Simulateur (URL de base, Bearer Token,
// langue choisie) — voir simulation_plan.md §7. Séparé de la session du flow
// (agroflux_flow_session dans App.tsx) : cette config est propre au
// Simulateur et ne doit pas être perdue en changeant de flow ou en faisant
// "Nouveau Projet".

export interface SimulatorConfig {
  baseUrl: string;
  token: string;
  // Vide = pas encore choisie ; c'est à l'UI du simulateur de retomber sur
  // flowData.languages[0] dans ce cas (cette config ne connaît pas le flow).
  language: string;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'agroflux_simulator_config';

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  baseUrl: '',
  token: '',
  language: ''
};

export const createMemoryStore = (): KeyValueStore => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    }
  };
};

// Singleton (pas une fabrique appelée à chaque résolution) : sans lui, deux
// appels successifs à loadSimulatorConfig/saveSimulatorConfig dans un
// environnement sans `localStorage` (SSR, Node) repartiraient chacun d'un
// magasin vide et la sauvegarde n'aurait jamais d'effet observable.
const fallbackStore = createMemoryStore();

const resolveDefaultStore = (): KeyValueStore =>
  typeof localStorage !== 'undefined' ? localStorage : fallbackStore;

export const loadSimulatorConfig = (store: KeyValueStore = resolveDefaultStore()): SimulatorConfig => {
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SIMULATOR_CONFIG };

  try {
    const parsed = JSON.parse(raw);
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : DEFAULT_SIMULATOR_CONFIG.baseUrl,
      token: typeof parsed.token === 'string' ? parsed.token : DEFAULT_SIMULATOR_CONFIG.token,
      language: typeof parsed.language === 'string' ? parsed.language : DEFAULT_SIMULATOR_CONFIG.language
    };
  } catch {
    return { ...DEFAULT_SIMULATOR_CONFIG };
  }
};

export const saveSimulatorConfig = (
  config: SimulatorConfig,
  store: KeyValueStore = resolveDefaultStore()
): void => {
  store.setItem(STORAGE_KEY, JSON.stringify(config));
};
