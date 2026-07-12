import { describe, it, expect } from 'vitest';
import {
  indexByBasename,
  resolveAudioPath,
  resolveImagePath,
  resolveRootOptionAudioPath,
  resolveLiteralPath
} from './simulationResources';
import type { ResourceIndex } from './simulationResources';
import type { FlowData } from '../types/flow';

// FileSystemFileHandle réel jamais utilisé par la logique de résolution
// (seule sa présence dans byPath compte) : une valeur factice suffit.
const fakeHandle = {} as FileSystemFileHandle;

const buildIndex = (paths: string[]): ResourceIndex => ({
  byPath: new Map(paths.map((p) => [p, fakeHandle])),
  byBasename: indexByBasename(paths)
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

describe('indexByBasename', () => {
  it('regroupe les chemins par nom de fichier', () => {
    const index = indexByBasename(['audio/fr/produits/mais.mp3', 'images/produits/mais.jpeg', 'audio/fon/produits/riz.mp3']);
    expect(index.get('mais.mp3')).toEqual(['audio/fr/produits/mais.mp3']);
    expect(index.get('mais.jpeg')).toEqual(['images/produits/mais.jpeg']);
    expect(index.get('riz.mp3')).toEqual(['audio/fon/produits/riz.mp3']);
  });

  it('conserve plusieurs chemins homonymes dans le même dossier racine', () => {
    const index = indexByBasename(['audio/fr/produits/mais.mp3', 'audio/fr/marches/mais.mp3']);
    expect(index.get('mais.mp3')).toEqual(['audio/fr/produits/mais.mp3', 'audio/fr/marches/mais.mp3']);
  });
});

describe('resolveAudioPath — variable', () => {
  it('résout le chemin canonique quand le fichier est présent', () => {
    const index = buildIndex(['audio/fon/produits/mais.mp3']);
    const flow = buildFlow({ variables: { produits: ['mais'] } });
    const res = resolveAudioPath(index, flow, 'produits', undefined, 'mais', 'fon');
    expect(res).toEqual({ path: 'audio/fon/produits/mais.mp3', method: 'canonical' });
  });

  it('respecte le mapping de dossier personnalisé', () => {
    const index = buildIndex(['audio/fon/prod/mais.mp3']);
    const flow = buildFlow({ variables: { produits: ['mais'] }, audio_mappings: { produits: 'prod' } });
    const res = resolveAudioPath(index, flow, 'produits', undefined, 'mais', 'fon');
    expect(res).toEqual({ path: 'audio/fon/prod/mais.mp3', method: 'canonical' });
  });

  it('retourne not-found si le fichier canonique est absent', () => {
    const index = buildIndex([]);
    const flow = buildFlow({ variables: { produits: ['mais'] } });
    const res = resolveAudioPath(index, flow, 'produits', undefined, 'mais', 'fon');
    expect(res).toEqual({ path: null, method: 'not-found' });
  });

  it('utilise le format audio personnalisé du flow', () => {
    const index = buildIndex(['audio/fr/produits/mais.wav']);
    const flow = buildFlow({ variables: { produits: ['mais'] }, resource_formats: { audio: 'wav', image: 'jpeg' } });
    const res = resolveAudioPath(index, flow, 'produits', undefined, 'mais', 'fr');
    expect(res).toEqual({ path: 'audio/fr/produits/mais.wav', method: 'canonical' });
  });
});

describe('resolveAudioPath — hashmap non exclu', () => {
  it('résout avec le segment clé en plus', () => {
    const index = buildIndex(['audio/fon/marche_par_departement/oueme/ouando.mp3']);
    const flow = buildFlow({ hashmaps: { marche_par_departement: { oueme: ['ouando'] } } });
    const res = resolveAudioPath(index, flow, 'marche_par_departement', 'oueme', 'ouando', 'fon');
    expect(res).toEqual({ path: 'audio/fon/marche_par_departement/oueme/ouando.mp3', method: 'canonical' });
  });
});

describe('resolveAudioPath — hashmap exclu (hashmaps_no_resources)', () => {
  const flow = buildFlow({
    hashmaps: { marches_par_departement: { oueme: ['bohicon'] } },
    hashmaps_no_resources: ['marches_par_departement']
  });

  it('retrouve la ressource par nom de fichier sous une autre variable', () => {
    const index = buildIndex(['audio/fon/marches/bohicon.mp3']);
    const res = resolveAudioPath(index, flow, 'marches_par_departement', 'oueme', 'bohicon', 'fon');
    expect(res).toEqual({ path: 'audio/fon/marches/bohicon.mp3', method: 'best-effort' });
  });

  it('ne tente jamais la résolution canonique, même si un fichier existe à cet emplacement', () => {
    const index = buildIndex(['audio/fon/marches_par_departement/oueme/bohicon.mp3']);
    // La règle métier dit que ce hashmap n'a jamais de ressources propres : la
    // fonction ne construit donc jamais ce chemin "canonique" pour le tester
    // directement — elle passe systématiquement par la recherche best-effort,
    // qui elle balaie tout l'index et peut retomber sur ce même fichier par
    // coïncidence de nom. Le point vérifié ici est le `method`, pas le chemin.
    const res = resolveAudioPath(index, flow, 'marches_par_departement', 'oueme', 'bohicon', 'fon');
    expect(res.method).toBe('best-effort');
  });

  it('ne remonte pas un fichier homonyme dans la mauvaise langue', () => {
    const index = buildIndex(['audio/yoruba/marches/bohicon.mp3']);
    const res = resolveAudioPath(index, flow, 'marches_par_departement', 'oueme', 'bohicon', 'fon');
    expect(res).toEqual({ path: null, method: 'not-found' });
  });

  it('retourne not-found si aucun fichier homonyme n\'existe nulle part', () => {
    const index = buildIndex([]);
    const res = resolveAudioPath(index, flow, 'marches_par_departement', 'oueme', 'inconnu', 'fon');
    expect(res).toEqual({ path: null, method: 'not-found' });
  });
});

describe('resolveImagePath', () => {
  it("résout le chemin canonique d'une variable, sans dimension langue", () => {
    const index = buildIndex(['images/produits/mais.jpeg']);
    const flow = buildFlow({ variables: { produits: ['mais'] } });
    const res = resolveImagePath(index, flow, 'produits', undefined, 'mais');
    expect(res).toEqual({ path: 'images/produits/mais.jpeg', method: 'canonical' });
  });

  it('résout un hashmap non exclu avec le segment clé', () => {
    const index = buildIndex(['images/marche_par_departement/oueme/ouando.jpeg']);
    const flow = buildFlow({ hashmaps: { marche_par_departement: { oueme: ['ouando'] } } });
    const res = resolveImagePath(index, flow, 'marche_par_departement', 'oueme', 'ouando');
    expect(res).toEqual({ path: 'images/marche_par_departement/oueme/ouando.jpeg', method: 'canonical' });
  });

  it('fait une recherche best-effort restreinte au dossier images/ pour un hashmap exclu', () => {
    const flow = buildFlow({
      hashmaps: { marches_par_departement: { oueme: ['bohicon'] } },
      hashmaps_no_resources: ['marches_par_departement']
    });
    const index = buildIndex(['images/marches/bohicon.jpeg', 'audio/fr/marches/bohicon.jpeg']);
    const res = resolveImagePath(index, flow, 'marches_par_departement', 'oueme', 'bohicon');
    expect(res).toEqual({ path: 'images/marches/bohicon.jpeg', method: 'best-effort' });
  });
});

describe('resolveLiteralPath', () => {
  it('résout un chemin présent tel quel, sans transformation', () => {
    const index = buildIndex(['intro/root_intro.mp3']);
    expect(resolveLiteralPath(index, 'intro/root_intro.mp3')).toEqual({ path: 'intro/root_intro.mp3', method: 'canonical' });
  });

  it('retourne not-found pour un chemin absent', () => {
    const index = buildIndex([]);
    expect(resolveLiteralPath(index, 'intro/root_intro.mp3')).toEqual({ path: null, method: 'not-found' });
  });
});

describe('resolveRootOptionAudioPath', () => {
  it("résout 'questions/{id}.{format}' si présent", () => {
    const index = buildIndex(['questions/achete_produit.mp3']);
    const flow = buildFlow();
    const res = resolveRootOptionAudioPath(index, flow, 'achete_produit');
    expect(res).toEqual({ path: 'questions/achete_produit.mp3', method: 'canonical' });
  });

  it('retourne not-found si absent (convention non garantie)', () => {
    const index = buildIndex([]);
    const flow = buildFlow();
    const res = resolveRootOptionAudioPath(index, flow, 'achete_produit');
    expect(res).toEqual({ path: null, method: 'not-found' });
  });
});
