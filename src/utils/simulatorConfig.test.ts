import { describe, it, expect } from 'vitest';
import {
  loadSimulatorConfig,
  saveSimulatorConfig,
  createMemoryStore,
  DEFAULT_SIMULATOR_CONFIG
} from './simulatorConfig';

describe('loadSimulatorConfig — valeurs par défaut', () => {
  it("retourne la config par défaut quand le magasin est vide", () => {
    const store = createMemoryStore();
    expect(loadSimulatorConfig(store)).toEqual(DEFAULT_SIMULATOR_CONFIG);
  });

  it('retourne la config par défaut si le JSON stocké est invalide', () => {
    const store = createMemoryStore();
    store.setItem('agroflux_simulator_config', '{ invalide');
    expect(loadSimulatorConfig(store)).toEqual(DEFAULT_SIMULATOR_CONFIG);
  });

  it('retombe sur les valeurs par défaut champ par champ si le type est incorrect', () => {
    const store = createMemoryStore();
    store.setItem('agroflux_simulator_config', JSON.stringify({ baseUrl: 42, token: null }));
    expect(loadSimulatorConfig(store)).toEqual(DEFAULT_SIMULATOR_CONFIG);
  });
});

describe('saveSimulatorConfig / loadSimulatorConfig — aller-retour', () => {
  it('relit exactement ce qui a été sauvegardé', () => {
    const store = createMemoryStore();
    const config = { baseUrl: 'https://api.exemple.com', token: 'secret', language: 'fon' };
    saveSimulatorConfig(config, store);
    expect(loadSimulatorConfig(store)).toEqual(config);
  });

  it('une sauvegarde écrase la précédente', () => {
    const store = createMemoryStore();
    saveSimulatorConfig({ baseUrl: 'https://a.com', token: '', language: 'fr' }, store);
    saveSimulatorConfig({ baseUrl: 'https://b.com', token: 'x', language: 'yoruba' }, store);
    expect(loadSimulatorConfig(store)).toEqual({ baseUrl: 'https://b.com', token: 'x', language: 'yoruba' });
  });
});

describe('createMemoryStore', () => {
  it('deux instances sont indépendantes', () => {
    const storeA = createMemoryStore();
    const storeB = createMemoryStore();
    saveSimulatorConfig({ baseUrl: 'https://a.com', token: '', language: 'fr' }, storeA);
    expect(loadSimulatorConfig(storeB)).toEqual(DEFAULT_SIMULATOR_CONFIG);
  });
});

describe('résolution du magasin par défaut (sans store explicite)', () => {
  it('persiste entre un save et un load successifs (repli mémoire en environnement Node)', () => {
    const config = { baseUrl: 'https://default-store.exemple.com', token: 't', language: 'dendi' };
    saveSimulatorConfig(config);
    expect(loadSimulatorConfig()).toEqual(config);
  });
});
