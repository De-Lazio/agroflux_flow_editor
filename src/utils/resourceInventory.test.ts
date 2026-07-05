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
  it('génère un audio et une image par valeur, dans le dossier mappé', () => {
    const result = buildVariableResources(
      { produits: ['mais', 'riz'] },
      { produits: 'produits' },
      'mp3',
      'jpeg'
    );

    expect(result.audios).toEqual(['audios/produits/mais.mp3', 'audios/produits/riz.mp3']);
    expect(result.images).toEqual(['images/produits/mais.jpeg', 'images/produits/riz.jpeg']);
  });

  it('retombe sur le nom de la variable si aucun mapping n\'est défini', () => {
    const result = buildVariableResources({ produits: ['mais'] }, {}, 'mp3', 'jpeg');
    expect(result.audios).toEqual(['audios/produits/mais.mp3']);
  });

  it('respecte les formats audio/image choisis', () => {
    const result = buildVariableResources({ produits: ['mais'] }, { produits: 'produits' }, 'wav', 'png');
    expect(result.audios).toEqual(['audios/produits/mais.wav']);
    expect(result.images).toEqual(['images/produits/mais.png']);
  });
});

describe('buildHashmapResources', () => {
  it('génère un audio et une image par valeur, groupés par clé', () => {
    const result = buildHashmapResources(
      { marche_par_departement: { oueme: ['ouando', 'bonou'], plateau: ['takon'] } },
      { marche_par_departement: 'marche_par_departement' },
      'mp3',
      'jpeg'
    );

    expect(result.audios).toEqual([
      'audios/marche_par_departement/oueme/ouando.mp3',
      'audios/marche_par_departement/oueme/bonou.mp3',
      'audios/marche_par_departement/plateau/takon.mp3'
    ]);
    expect(result.images).toEqual([
      'images/marche_par_departement/oueme/ouando.jpeg',
      'images/marche_par_departement/oueme/bonou.jpeg',
      'images/marche_par_departement/plateau/takon.jpeg'
    ]);
  });

  it('retourne des listes vides si aucun hashmap n\'est fourni', () => {
    const result = buildHashmapResources({}, {}, 'mp3', 'jpeg');
    expect(result.audios).toEqual([]);
    expect(result.images).toEqual([]);
  });
});
