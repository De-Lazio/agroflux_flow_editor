import { describe, it, expect } from 'vitest';
import { parseRemoteData, computeImportDiff, applyImport } from './remoteImport';
import type { RemoteData } from './remoteImport';
import type { ActiveOverrides, FlowHashmaps, FlowVariables } from '../types/flow';

const emptyOverrides: ActiveOverrides = { variables: {}, hashmaps: {} };

describe('parseRemoteData', () => {
  it('accepte un payload valide avec variables et hashmaps', () => {
    const result = parseRemoteData({
      variables: { produits: { mais: true, riz: false } },
      hashmaps: { loc_marche: { Oueme: { active: true, values: { 'Porto-Novo': true } } } }
    });
    expect(result.variables).toEqual({ produits: { mais: true, riz: false } });
    expect(result.hashmaps).toEqual({ loc_marche: { Oueme: { active: true, values: { 'Porto-Novo': true } } } });
  });

  it('tolère l\'absence de variables ou hashmaps (défaut objet vide)', () => {
    expect(parseRemoteData({})).toEqual({ variables: {}, hashmaps: {} });
  });

  it('rejette une réponse qui n\'est pas un objet', () => {
    expect(() => parseRemoteData(null)).toThrow();
    expect(() => parseRemoteData('texte')).toThrow();
    expect(() => parseRemoteData([1, 2])).toThrow();
  });

  it('rejette une variable qui n\'est pas un objet { valeur: booléen }', () => {
    expect(() => parseRemoteData({ variables: { produits: ['mais'] } })).toThrow();
    expect(() => parseRemoteData({ variables: { produits: 'mais' } })).toThrow();
  });

  it('rejette une valeur de variable dont l\'état actif n\'est pas un booléen', () => {
    expect(() => parseRemoteData({ variables: { produits: { mais: 'oui' } } })).toThrow();
  });

  it('rejette une clé de hashmap sans champ "active" booléen', () => {
    expect(() => parseRemoteData({ hashmaps: { loc_marche: { Oueme: { values: { x: true } } } } })).toThrow();
  });

  it('rejette une clé de hashmap sans champ "values" objet', () => {
    expect(() => parseRemoteData({ hashmaps: { loc_marche: { Oueme: { active: true, values: ['x'] } } } })).toThrow();
  });

  it('rejette une valeur de hashmap dont l\'état actif n\'est pas un booléen', () => {
    expect(() => parseRemoteData({ hashmaps: { loc_marche: { Oueme: { active: true, values: { x: 'oui' } } } } })).toThrow();
  });
});

describe('computeImportDiff', () => {
  it('classe une variable absente localement comme addition', () => {
    const remote: RemoteData = { variables: { produits: { mais: true } }, hashmaps: {} };
    const diff = computeImportDiff({}, {}, emptyOverrides, remote);
    expect(diff.variableAdditions).toEqual(['produits']);
    expect(diff.variableConflicts).toEqual([]);
  });

  it('ne signale pas de conflit si les valeurs et l\'état actif sont identiques', () => {
    const local: FlowVariables = { produits: ['mais', 'riz'] };
    const remote: RemoteData = { variables: { produits: { riz: true, mais: true } }, hashmaps: {} };
    const diff = computeImportDiff(local, {}, emptyOverrides, remote);
    expect(diff.variableConflicts).toEqual([]);
    expect(diff.variableAdditions).toEqual([]);
  });

  it('signale un conflit quand l\'ensemble de valeurs diffère', () => {
    const local: FlowVariables = { produits: ['mais'] };
    const remote: RemoteData = { variables: { produits: { mais: true, riz: true } }, hashmaps: {} };
    const diff = computeImportDiff(local, {}, emptyOverrides, remote);
    expect(diff.variableConflicts).toHaveLength(1);
    expect(diff.variableConflicts[0]).toEqual({
      name: 'produits', localValues: ['mais'], remoteValues: ['mais', 'riz'], localInactive: [], remoteInactive: []
    });
  });

  it('signale un conflit quand seul l\'état actif diffère (même ensemble de valeurs)', () => {
    const local: FlowVariables = { produits: ['mais', 'riz'] };
    const overrides: ActiveOverrides = { variables: { produits: ['riz'] }, hashmaps: {} };
    // Local : riz inactif. Distant : riz actif => désaccord malgré un ensemble de valeurs identique.
    const remote: RemoteData = { variables: { produits: { mais: true, riz: true } }, hashmaps: {} };
    const diff = computeImportDiff(local, {}, overrides, remote);
    expect(diff.variableConflicts).toHaveLength(1);
    expect(diff.variableConflicts[0].remoteInactive).toEqual([]);
    expect(diff.variableConflicts[0].localInactive).toEqual(['riz']);
  });

  it('gère les hashmaps de la même façon (addition vs conflit)', () => {
    const localHashmaps: FlowHashmaps = { loc_marche: { Oueme: ['Porto-Novo'] } };
    const remote: RemoteData = {
      variables: {},
      hashmaps: {
        loc_marche: { Oueme: { active: true, values: { 'Porto-Novo': true, Seme: true } } },
        loc_autre: { Littoral: { active: true, values: { Cotonou: true } } }
      }
    };
    const diff = computeImportDiff({}, localHashmaps, emptyOverrides, remote);
    expect(diff.hashmapAdditions).toEqual(['loc_autre']);
    expect(diff.hashmapConflicts).toHaveLength(1);
    expect(diff.hashmapConflicts[0].name).toBe('loc_marche');
  });

  it('signale un conflit de hashmap quand seul l\'état actif d\'une clé diffère', () => {
    const localHashmaps: FlowHashmaps = { loc_marche: { Oueme: ['Porto-Novo'] } };
    const overrides: ActiveOverrides = { variables: {}, hashmaps: {} }; // Oueme actif en local
    const remote: RemoteData = {
      variables: {},
      // Distant : Oueme désactivée en bloc, alors que le local la considère active.
      hashmaps: { loc_marche: { Oueme: { active: false, values: { 'Porto-Novo': true } } } }
    };
    const diff = computeImportDiff({}, localHashmaps, overrides, remote);
    expect(diff.hashmapConflicts).toHaveLength(1);
    expect(diff.hashmapConflicts[0].remoteInactiveKeys).toEqual(['Oueme']);
  });
});

describe('applyImport', () => {
  const remote: RemoteData = {
    variables: {
      produits: { mais: true, riz: true, nouvelle: false }
    },
    hashmaps: {
      marche_par_departement: { Oueme: { active: true, values: { Seme: false } } },
      loc_autre: { Littoral: { active: false, values: { Cotonou: true } } }
    }
  };

  it('ajoute automatiquement les clés distantes absentes en local, avec leur état actif', () => {
    const result = applyImport({}, {}, emptyOverrides, remote, {}, {});
    expect(result.variables.produits).toEqual(['mais', 'riz', 'nouvelle']);
    expect(result.activeOverrides.variables.produits).toEqual(['nouvelle']);

    expect(result.hashmaps.loc_autre).toEqual({ Littoral: ['Cotonou'] });
    expect(result.activeOverrides.hashmaps.loc_autre).toEqual({ inactive_keys: ['Littoral'] });
  });

  it('résout un conflit de variable avec "local" (garde valeurs et état actif locaux)', () => {
    const local: FlowVariables = { produits: ['mais', 'sorgho'] };
    const overrides: ActiveOverrides = { variables: { produits: ['sorgho'] }, hashmaps: {} };
    const result = applyImport(local, {}, overrides, remote, { produits: 'local' }, {});
    expect(result.variables.produits).toEqual(['mais', 'sorgho']);
    expect(result.activeOverrides.variables.produits).toEqual(['sorgho']);
  });

  it('résout un conflit de variable avec "remote" (remplace valeurs et état actif par le distant)', () => {
    const local: FlowVariables = { produits: ['mais', 'sorgho'] };
    const overrides: ActiveOverrides = { variables: { produits: ['sorgho'] }, hashmaps: {} };
    const result = applyImport(local, {}, overrides, remote, { produits: 'remote' }, {});
    expect(result.variables.produits).toEqual(['mais', 'riz', 'nouvelle']);
    expect(result.activeOverrides.variables.produits).toEqual(['nouvelle']);
  });

  it('fusionne en priorité locale : l\'état actif local l\'emporte pour les valeurs déjà connues', () => {
    const local: FlowVariables = { produits: ['mais', 'riz'] };
    // Localement, "riz" est marqué inactif alors que le distant le dit actif : priorité locale => reste inactif.
    const overrides: ActiveOverrides = { variables: { produits: ['riz'] }, hashmaps: {} };
    const result = applyImport(local, {}, overrides, remote, { produits: 'merge-local' }, {});
    expect(result.variables.produits).toEqual(['mais', 'riz', 'nouvelle']);
    // "riz" reste inactif (priorité locale), "nouvelle" adopte l'état distant (nouvelle valeur).
    expect(result.activeOverrides.variables.produits.sort()).toEqual(['nouvelle', 'riz']);
  });

  it('fusionne en priorité distante : l\'état actif distant l\'emporte pour les valeurs qu\'il connaît', () => {
    const local: FlowVariables = { produits: ['mais', 'riz', 'sorgho'] };
    // Localement "riz" est inactif, mais le distant le déclare actif : priorité distante => redevient actif.
    // "sorgho" n'est pas mentionné par le distant : son état local (inactif) doit être préservé.
    const overrides: ActiveOverrides = { variables: { produits: ['riz', 'sorgho'] }, hashmaps: {} };
    const result = applyImport(local, {}, overrides, remote, { produits: 'merge-remote' }, {});
    expect(result.variables.produits).toEqual(['mais', 'riz', 'nouvelle', 'sorgho']);
    expect(result.activeOverrides.variables.produits.sort()).toEqual(['nouvelle', 'sorgho']);
  });

  it('fusionne un hashmap clé par clé, y compris l\'état actif de chaque clé', () => {
    const localHashmaps: FlowHashmaps = { marche_par_departement: { Oueme: ['Porto-Novo'], Littoral: ['Cotonou'] } };
    // Localement Oueme est désactivée ; le distant la déclare active => priorité distante fait gagner "active".
    const overrides: ActiveOverrides = {
      variables: {},
      hashmaps: { marche_par_departement: { inactive_keys: ['Oueme'] } }
    };
    const result = applyImport({}, localHashmaps, overrides, remote, {}, { marche_par_departement: 'merge-remote' });
    expect(result.hashmaps.marche_par_departement).toEqual({ Oueme: ['Seme', 'Porto-Novo'], Littoral: ['Cotonou'] });
    // Oueme réactivée (priorité distante), Seme apporte son propre état inactif (nouvelle valeur).
    expect(result.activeOverrides.hashmaps.marche_par_departement).toEqual({ inactive_values: { Oueme: ['Seme'] } });
  });

  it('ne modifie pas les variables locales absentes du payload distant', () => {
    const local: FlowVariables = { autre_var: ['valeur'] };
    const overrides: ActiveOverrides = { variables: { autre_var: ['valeur'] }, hashmaps: {} };
    const result = applyImport(local, {}, overrides, remote, {}, {});
    expect(result.variables.autre_var).toEqual(['valeur']);
    expect(result.activeOverrides.variables.autre_var).toEqual(['valeur']);
  });
});
