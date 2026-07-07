import { describe, it, expect } from 'vitest';
import { parseRemoteData, computeImportDiff, applyImport } from './remoteImport';
import type { FlowVariables, FlowHashmaps } from '../types/flow';

describe('parseRemoteData', () => {
  it('accepte un payload valide avec variables et hashmaps', () => {
    const result = parseRemoteData({
      variables: { produits: ['mais', 'riz'] },
      hashmaps: { loc_marche: { Ouémé: ['Porto-Novo'] } }
    });
    expect(result.variables).toEqual({ produits: ['mais', 'riz'] });
    expect(result.hashmaps).toEqual({ loc_marche: { Ouémé: ['Porto-Novo'] } });
  });

  it('tolère l\'absence de variables ou hashmaps (défaut objet vide)', () => {
    expect(parseRemoteData({})).toEqual({ variables: {}, hashmaps: {} });
  });

  it('rejette une réponse qui n\'est pas un objet', () => {
    expect(() => parseRemoteData(null)).toThrow();
    expect(() => parseRemoteData('texte')).toThrow();
    expect(() => parseRemoteData([1, 2])).toThrow();
  });

  it('rejette une variable qui n\'est pas un tableau de chaînes', () => {
    expect(() => parseRemoteData({ variables: { produits: 'mais' } })).toThrow();
    expect(() => parseRemoteData({ variables: { produits: [1, 2] } })).toThrow();
  });

  it('rejette un hashmap malformé', () => {
    expect(() => parseRemoteData({ hashmaps: { loc_marche: ['Ouémé'] } })).toThrow();
    expect(() => parseRemoteData({ hashmaps: { loc_marche: { Ouémé: 'Porto-Novo' } } })).toThrow();
  });
});

describe('computeImportDiff', () => {
  it('classe une variable absente localement comme addition', () => {
    const diff = computeImportDiff({}, {}, { variables: { produits: ['mais'] }, hashmaps: {} });
    expect(diff.variableAdditions).toEqual(['produits']);
    expect(diff.variableConflicts).toEqual([]);
  });

  it('ne signale pas de conflit si les valeurs sont identiques (même en désordre)', () => {
    const local: FlowVariables = { produits: ['mais', 'riz'] };
    const diff = computeImportDiff(local, {}, { variables: { produits: ['riz', 'mais'] }, hashmaps: {} });
    expect(diff.variableConflicts).toEqual([]);
    expect(diff.variableAdditions).toEqual([]);
  });

  it('signale un conflit quand le contenu diffère', () => {
    const local: FlowVariables = { produits: ['mais'] };
    const diff = computeImportDiff(local, {}, { variables: { produits: ['mais', 'riz'] }, hashmaps: {} });
    expect(diff.variableConflicts).toEqual([{ name: 'produits', localValues: ['mais'], remoteValues: ['mais', 'riz'] }]);
  });

  it('gère les hashmaps de la même façon (addition vs conflit)', () => {
    const localHashmaps: FlowHashmaps = { loc_marche: { Ouémé: ['Porto-Novo'] } };
    const diff = computeImportDiff({}, localHashmaps, {
      variables: {},
      hashmaps: {
        loc_marche: { Ouémé: ['Porto-Novo', 'Sèmè'] },
        loc_autre: { Littoral: ['Cotonou'] }
      }
    });
    expect(diff.hashmapAdditions).toEqual(['loc_autre']);
    expect(diff.hashmapConflicts).toHaveLength(1);
    expect(diff.hashmapConflicts[0].name).toBe('loc_marche');
  });
});

describe('applyImport', () => {
  const remote = {
    variables: { produits: ['mais', 'riz'], nouvelle: ['x'] },
    hashmaps: { loc_marche: { Ouémé: ['Sèmè'] }, loc_autre: { Littoral: ['Cotonou'] } }
  };

  it('ajoute automatiquement les clés distantes absentes en local', () => {
    const result = applyImport({}, {}, remote, {}, {});
    expect(result.variables.nouvelle).toEqual(['x']);
    expect(result.hashmaps.loc_autre).toEqual({ Littoral: ['Cotonou'] });
  });

  it('résout un conflit de variable avec "local" (garde la valeur locale telle quelle)', () => {
    const local: FlowVariables = { produits: ['mais'] };
    const result = applyImport(local, {}, remote, { produits: 'local' }, {});
    expect(result.variables.produits).toEqual(['mais']);
  });

  it('résout un conflit de variable avec "remote" (remplace par la valeur distante)', () => {
    const local: FlowVariables = { produits: ['mais'] };
    const result = applyImport(local, {}, remote, { produits: 'remote' }, {});
    expect(result.variables.produits).toEqual(['mais', 'riz']);
  });

  it('fusionne en priorité locale : les valeurs locales gardent leur ordre en tête', () => {
    const local: FlowVariables = { produits: ['riz', 'sorgho'] };
    const result = applyImport(local, {}, remote, { produits: 'merge-local' }, {});
    expect(result.variables.produits).toEqual(['riz', 'sorgho', 'mais']);
  });

  it('fusionne en priorité distante : les valeurs distantes passent en tête', () => {
    const local: FlowVariables = { produits: ['riz', 'sorgho'] };
    const result = applyImport(local, {}, remote, { produits: 'merge-remote' }, {});
    expect(result.variables.produits).toEqual(['mais', 'riz', 'sorgho']);
  });

  it('fusionne un hashmap clé par clé sans écraser les clés locales absentes du distant', () => {
    const localHashmaps: FlowHashmaps = { loc_marche: { Ouémé: ['Porto-Novo'], Littoral: ['Cotonou'] } };
    const result = applyImport({}, localHashmaps, remote, {}, { loc_marche: 'merge-remote' });
    expect(result.hashmaps.loc_marche).toEqual({
      Ouémé: ['Sèmè', 'Porto-Novo'],
      Littoral: ['Cotonou']
    });
  });

  it('ne modifie pas les variables locales absentes du payload distant', () => {
    const local: FlowVariables = { autre_var: ['valeur'] };
    const result = applyImport(local, {}, remote, {}, {});
    expect(result.variables.autre_var).toEqual(['valeur']);
  });
});
