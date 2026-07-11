import { describe, it, expect } from 'vitest';
import {
  createEmptyActiveOverrides,
  isVariableValueActive,
  isHashmapKeyActive,
  isHashmapValueActive,
  toggleVariableValueActive,
  pruneVariableOverrideValue,
  removeVariableOverrides,
  toggleHashmapKeyActive,
  toggleHashmapValueActive,
  removeHashmapKeyOverrides,
  pruneHashmapOverrideValue,
  removeHashmapOverrides
} from './activeState';
import type { ActiveOverrides } from '../types/flow';

describe('lecture — défaut actif', () => {
  it('tout est actif quand active_overrides est vide', () => {
    const empty = createEmptyActiveOverrides();
    expect(isVariableValueActive(empty, 'produits', 'mais')).toBe(true);
    expect(isHashmapKeyActive(empty, 'marche_par_departement', 'oueme')).toBe(true);
    expect(isHashmapValueActive(empty, 'marche_par_departement', 'oueme', 'ouando')).toBe(true);
  });

  it('une valeur listée dans variables devient inactive, les autres restent actives', () => {
    const overrides: ActiveOverrides = { variables: { produits: ['sorgho'] }, hashmaps: {} };
    expect(isVariableValueActive(overrides, 'produits', 'sorgho')).toBe(false);
    expect(isVariableValueActive(overrides, 'produits', 'mais')).toBe(true);
  });

  it('une clé de hashmap inactive désactive en cascade toutes ses valeurs', () => {
    const overrides: ActiveOverrides = {
      variables: {},
      hashmaps: { marche_par_departement: { inactive_keys: ['plateau'] } }
    };
    expect(isHashmapKeyActive(overrides, 'marche_par_departement', 'plateau')).toBe(false);
    expect(isHashmapValueActive(overrides, 'marche_par_departement', 'plateau', 'sakete')).toBe(false);
    expect(isHashmapKeyActive(overrides, 'marche_par_departement', 'oueme')).toBe(true);
  });

  it('une valeur individuelle inactive ne désactive pas le reste de sa clé', () => {
    const overrides: ActiveOverrides = {
      variables: {},
      hashmaps: { marche_par_departement: { inactive_values: { oueme: ['adjohoun'] } } }
    };
    expect(isHashmapValueActive(overrides, 'marche_par_departement', 'oueme', 'adjohoun')).toBe(false);
    expect(isHashmapValueActive(overrides, 'marche_par_departement', 'oueme', 'ouando')).toBe(true);
    expect(isHashmapKeyActive(overrides, 'marche_par_departement', 'oueme')).toBe(true);
  });
});

describe('toggleVariableValueActive', () => {
  it('désactive une valeur active, puis la réactive (round-trip)', () => {
    const empty = createEmptyActiveOverrides();
    const afterOff = toggleVariableValueActive(empty, 'produits', 'mais');
    expect(isVariableValueActive(afterOff, 'produits', 'mais')).toBe(false);

    const afterOn = toggleVariableValueActive(afterOff, 'produits', 'mais');
    expect(isVariableValueActive(afterOn, 'produits', 'mais')).toBe(true);
    // De retour à l'état actif, l'exception est purgée entièrement (pas de tableau vide qui traîne).
    expect(afterOn.variables.produits).toBeUndefined();
  });

  it('ne mute jamais l\'objet reçu en entrée', () => {
    const original = createEmptyActiveOverrides();
    const originalSnapshot = JSON.parse(JSON.stringify(original));
    toggleVariableValueActive(original, 'produits', 'mais');
    expect(original).toEqual(originalSnapshot);
  });

  it('ne touche pas les autres variables', () => {
    const overrides: ActiveOverrides = { variables: { departements: ['zou'] }, hashmaps: {} };
    const next = toggleVariableValueActive(overrides, 'produits', 'mais');
    expect(next.variables.departements).toEqual(['zou']);
    expect(next.variables.produits).toEqual(['mais']);
  });
});

describe('pruneVariableOverrideValue / removeVariableOverrides', () => {
  it('retire une valeur précise de la liste des exceptions', () => {
    const overrides: ActiveOverrides = { variables: { produits: ['mais', 'riz'] }, hashmaps: {} };
    const next = pruneVariableOverrideValue(overrides, 'produits', 'mais');
    expect(next.variables.produits).toEqual(['riz']);
  });

  it('supprime la clé de variable entière si elle devient vide', () => {
    const overrides: ActiveOverrides = { variables: { produits: ['mais'] }, hashmaps: {} };
    const next = pruneVariableOverrideValue(overrides, 'produits', 'mais');
    expect(next.variables.produits).toBeUndefined();
  });

  it('ne fait rien si la valeur n\'était pas listée', () => {
    const overrides: ActiveOverrides = { variables: { produits: ['mais'] }, hashmaps: {} };
    const next = pruneVariableOverrideValue(overrides, 'produits', 'riz');
    expect(next.variables.produits).toEqual(['mais']);
  });

  it('removeVariableOverrides supprime toute trace de la variable', () => {
    const overrides: ActiveOverrides = { variables: { produits: ['mais', 'riz'] }, hashmaps: {} };
    const next = removeVariableOverrides(overrides, 'produits');
    expect(next.variables.produits).toBeUndefined();
  });

  it('removeVariableOverrides est un no-op si la variable n\'a pas d\'exception', () => {
    const overrides = createEmptyActiveOverrides();
    const next = removeVariableOverrides(overrides, 'produits');
    expect(next).toEqual(overrides);
  });
});

describe('toggleHashmapKeyActive', () => {
  it('désactive puis réactive une clé (round-trip), en purgeant l\'entrée vide', () => {
    const empty = createEmptyActiveOverrides();
    const afterOff = toggleHashmapKeyActive(empty, 'marche_par_departement', 'plateau');
    expect(isHashmapKeyActive(afterOff, 'marche_par_departement', 'plateau')).toBe(false);

    const afterOn = toggleHashmapKeyActive(afterOff, 'marche_par_departement', 'plateau');
    expect(isHashmapKeyActive(afterOn, 'marche_par_departement', 'plateau')).toBe(true);
    expect(afterOn.hashmaps.marche_par_departement).toBeUndefined();
  });

  it('ne touche pas les exceptions de valeurs déjà présentes sur le même hashmap', () => {
    const overrides: ActiveOverrides = {
      variables: {},
      hashmaps: { marche_par_departement: { inactive_values: { oueme: ['adjohoun'] } } }
    };
    const next = toggleHashmapKeyActive(overrides, 'marche_par_departement', 'plateau');
    expect(next.hashmaps.marche_par_departement.inactive_values).toEqual({ oueme: ['adjohoun'] });
    expect(next.hashmaps.marche_par_departement.inactive_keys).toEqual(['plateau']);
  });
});

describe('toggleHashmapValueActive', () => {
  it('bascule une valeur indépendamment de l\'état de sa clé', () => {
    const empty = createEmptyActiveOverrides();
    const afterOff = toggleHashmapValueActive(empty, 'marche_par_departement', 'oueme', 'adjohoun');
    expect(isHashmapValueActive(afterOff, 'marche_par_departement', 'oueme', 'adjohoun')).toBe(false);
    expect(isHashmapValueActive(afterOff, 'marche_par_departement', 'oueme', 'ouando')).toBe(true);

    const afterOn = toggleHashmapValueActive(afterOff, 'marche_par_departement', 'oueme', 'adjohoun');
    expect(isHashmapValueActive(afterOn, 'marche_par_departement', 'oueme', 'adjohoun')).toBe(true);
    expect(afterOn.hashmaps.marche_par_departement).toBeUndefined();
  });

  it('gère plusieurs clés du même hashmap sans interférence', () => {
    const empty = createEmptyActiveOverrides();
    const step1 = toggleHashmapValueActive(empty, 'marche_par_departement', 'oueme', 'adjohoun');
    const step2 = toggleHashmapValueActive(step1, 'marche_par_departement', 'plateau', 'ketou');

    expect(isHashmapValueActive(step2, 'marche_par_departement', 'oueme', 'adjohoun')).toBe(false);
    expect(isHashmapValueActive(step2, 'marche_par_departement', 'plateau', 'ketou')).toBe(false);
    expect(isHashmapValueActive(step2, 'marche_par_departement', 'oueme', 'ouando')).toBe(true);
  });
});

describe('removeHashmapKeyOverrides / pruneHashmapOverrideValue / removeHashmapOverrides', () => {
  it('removeHashmapKeyOverrides nettoie à la fois inactive_keys et inactive_values pour cette clé', () => {
    const overrides: ActiveOverrides = {
      variables: {},
      hashmaps: {
        marche_par_departement: {
          inactive_keys: ['plateau'],
          inactive_values: { plateau: ['ketou'], oueme: ['adjohoun'] }
        }
      }
    };
    const next = removeHashmapKeyOverrides(overrides, 'marche_par_departement', 'plateau');
    expect(next.hashmaps.marche_par_departement.inactive_keys).toBeUndefined();
    expect(next.hashmaps.marche_par_departement.inactive_values).toEqual({ oueme: ['adjohoun'] });
  });

  it('pruneHashmapOverrideValue retire une valeur précise sans toucher aux autres clés', () => {
    const overrides: ActiveOverrides = {
      variables: {},
      hashmaps: { marche_par_departement: { inactive_values: { oueme: ['adjohoun', 'seme'] } } }
    };
    const next = pruneHashmapOverrideValue(overrides, 'marche_par_departement', 'oueme', 'adjohoun');
    expect(next.hashmaps.marche_par_departement.inactive_values).toEqual({ oueme: ['seme'] });
  });

  it('removeHashmapOverrides supprime tout l\'overlay du hashmap', () => {
    const overrides: ActiveOverrides = {
      variables: {},
      hashmaps: { marche_par_departement: { inactive_keys: ['plateau'] }, autre_map: { inactive_keys: ['x'] } }
    };
    const next = removeHashmapOverrides(overrides, 'marche_par_departement');
    expect(next.hashmaps.marche_par_departement).toBeUndefined();
    expect(next.hashmaps.autre_map).toEqual({ inactive_keys: ['x'] });
  });

  it('removeHashmapOverrides est un no-op si le hashmap n\'a pas d\'exception', () => {
    const overrides = createEmptyActiveOverrides();
    const next = removeHashmapOverrides(overrides, 'marche_par_departement');
    expect(next).toEqual(overrides);
  });
});
