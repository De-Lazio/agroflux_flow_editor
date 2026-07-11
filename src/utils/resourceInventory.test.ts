import { describe, it, expect } from 'vitest';
import { syncResourceMappings, buildVariableResources, buildHashmapResources } from './resourceInventory';

describe('syncResourceMappings', () => {
  it('crée une entrée par défaut (dossier = nom) pour chaque variable et hashmap', () => {
    const result = syncResourceMappings(
      {},
      { produits: ['mais', 'soja'] },
      { marche_par_departement: { oueme: ['ouando'] } }
    );

    expect(result).toEqual({
      produits: 'produits',
      marche_par_departement: 'marche_par_departement'
    });
  });

  it('conserve une valeur personnalisée existante', () => {
    const result = syncResourceMappings(
      { produits: 'produits_v2' },
      { produits: ['mais'] },
      {}
    );

    expect(result.produits).toBe('produits_v2');
  });

  it('retire les entrées qui ne correspondent plus à une variable ou un hashmap existant', () => {
    const result = syncResourceMappings(
      { produits: 'produits', ancienne_variable: 'ancien_dossier' },
      { produits: ['mais'] },
      {}
    );

    expect(result).toEqual({ produits: 'produits' });
  });
});

describe('buildVariableResources', () => {
  it('génère un audio par langue active et une seule image (jamais dupliquée par langue), dans le dossier mappé', () => {
    const result = buildVariableResources(
      { produits: ['mais', 'riz'] },
      { produits: 'produits' },
      ['fon', 'yoruba'],
      'mp3',
      'jpeg'
    );

    expect(result.audios).toEqual([
      'audio/fon/produits/mais.mp3',
      'audio/yoruba/produits/mais.mp3',
      'audio/fon/produits/riz.mp3',
      'audio/yoruba/produits/riz.mp3'
    ]);
    expect(result.images).toEqual(['images/produits/mais.jpeg', 'images/produits/riz.jpeg']);
  });

  it('retombe sur le nom de la variable si aucun mapping n\'est défini', () => {
    const result = buildVariableResources({ produits: ['mais'] }, {}, ['fon'], 'mp3', 'jpeg');
    expect(result.audios).toEqual(['audio/fon/produits/mais.mp3']);
  });

  it('respecte les formats audio/image choisis', () => {
    const result = buildVariableResources({ produits: ['mais'] }, { produits: 'produits' }, ['fon'], 'wav', 'png');
    expect(result.audios).toEqual(['audio/fon/produits/mais.wav']);
    expect(result.images).toEqual(['images/produits/mais.png']);
  });

  it('dédoublonne une langue déclarée deux fois (JSON importé à la main, hors du garde-fou de FlowSettingsManager)', () => {
    const result = buildVariableResources({ produits: ['mais'] }, { produits: 'produits' }, ['fon', 'fon', 'yoruba']);
    expect(result.audios).toEqual(['audio/fon/produits/mais.mp3', 'audio/yoruba/produits/mais.mp3']);
  });

  it('utilise les langues par défaut si aucune langue n\'est précisée', () => {
    const result = buildVariableResources({ produits: ['mais'] }, { produits: 'produits' });
    expect(result.audios).toEqual([
      'audio/fr/produits/mais.mp3',
      'audio/fon/produits/mais.mp3',
      'audio/yoruba/produits/mais.mp3',
      'audio/dendi/produits/mais.mp3',
      'audio/adja/produits/mais.mp3'
    ]);
  });

  it('ne génère aucun audio si la liste de langues est explicitement vide (l\'image reste générée)', () => {
    const result = buildVariableResources({ produits: ['mais'] }, { produits: 'produits' }, []);
    expect(result.audios).toEqual([]);
    expect(result.images).toEqual(['images/produits/mais.jpeg']);
  });
});

describe('buildHashmapResources', () => {
  it('génère un audio par langue active, groupé par clé, et une seule image par valeur', () => {
    const result = buildHashmapResources(
      { marche_par_departement: { oueme: ['ouando', 'bonou'], plateau: ['takon'] } },
      { marche_par_departement: 'marche_par_departement' },
      ['fon'],
      'mp3',
      'jpeg'
    );

    expect(result.audios).toEqual([
      'audio/fon/marche_par_departement/oueme/ouando.mp3',
      'audio/fon/marche_par_departement/oueme/bonou.mp3',
      'audio/fon/marche_par_departement/plateau/takon.mp3'
    ]);
    expect(result.images).toEqual([
      'images/marche_par_departement/oueme/ouando.jpeg',
      'images/marche_par_departement/oueme/bonou.jpeg',
      'images/marche_par_departement/plateau/takon.jpeg'
    ]);
  });

  it('retourne des listes vides si aucun hashmap n\'est fourni', () => {
    const result = buildHashmapResources({}, {}, ['fon'], 'mp3', 'jpeg');
    expect(result.audios).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it('exclut totalement (audio et image) un hashmap listé dans excludedHashmaps', () => {
    const result = buildHashmapResources(
      { marche_par_departement: { oueme: ['ouando'] }, loc_autre: { littoral: ['cotonou'] } },
      {},
      ['fon'],
      'mp3',
      'jpeg',
      ['marche_par_departement']
    );

    expect(result.audios).toEqual(['audio/fon/loc_autre/littoral/cotonou.mp3']);
    expect(result.images).toEqual(['images/loc_autre/littoral/cotonou.jpeg']);
  });

  it('n\'exclut rien par défaut si excludedHashmaps est omis', () => {
    const result = buildHashmapResources({ marche_par_departement: { oueme: ['ouando'] } }, {}, ['fon'], 'mp3', 'jpeg');
    expect(result.audios).toEqual(['audio/fon/marche_par_departement/oueme/ouando.mp3']);
  });
});
