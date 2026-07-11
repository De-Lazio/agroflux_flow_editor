// Lecture/écriture de l'overlay `active_overrides` (voir PLAN_ACTIVE_STATE.md
// et types/flow.ts). Convention : absent d'une liste = actif. Toutes les
// fonctions d'écriture sont pures (retournent un nouvel objet, ne mutent
// jamais leur argument) et se nettoient elles-mêmes — une entrée qui
// redevient entièrement active disparaît de l'overlay plutôt que d'y laisser
// un tableau vide, pour que le JSON produit reste minimal et lisible.

import type { ActiveOverrides, HashmapActiveOverride } from '../types/flow';

export const createEmptyActiveOverrides = (): ActiveOverrides => ({ variables: {}, hashmaps: {} });

const withoutValue = (values: string[], value: string): string[] => values.filter((v) => v !== value);

// --- Lecture ---------------------------------------------------------------

export const isVariableValueActive = (overrides: ActiveOverrides, varName: string, value: string): boolean =>
  !overrides.variables[varName]?.includes(value);

export const isHashmapKeyActive = (overrides: ActiveOverrides, mapName: string, key: string): boolean =>
  !overrides.hashmaps[mapName]?.inactive_keys?.includes(key);

// Une valeur hérite de l'état inactif de sa clé : désactiver "plateau" en bloc
// désactive de fait toutes ses valeurs, sans qu'il soit besoin de les lister
// individuellement dans inactive_values.
export const isHashmapValueActive = (
  overrides: ActiveOverrides,
  mapName: string,
  key: string,
  value: string
): boolean =>
  isHashmapKeyActive(overrides, mapName, key) &&
  !overrides.hashmaps[mapName]?.inactive_values?.[key]?.includes(value);

// --- Écriture ----------------------------------------------------------------

const updateVariableList = (
  overrides: ActiveOverrides,
  varName: string,
  mutate: (inactiveValues: string[]) => string[]
): ActiveOverrides => {
  const nextList = mutate(overrides.variables[varName] || []);
  const variables = { ...overrides.variables };
  if (nextList.length === 0) {
    delete variables[varName];
  } else {
    variables[varName] = nextList;
  }
  return { ...overrides, variables };
};

export const toggleVariableValueActive = (overrides: ActiveOverrides, varName: string, value: string): ActiveOverrides => {
  const currentlyActive = isVariableValueActive(overrides, varName, value);
  return updateVariableList(overrides, varName, (inactiveValues) =>
    currentlyActive ? [...inactiveValues, value] : withoutValue(inactiveValues, value)
  );
};

// À appeler quand une valeur de variable est supprimée, pour ne pas laisser
// une exception pointer vers une valeur qui n'existe plus.
export const pruneVariableOverrideValue = (overrides: ActiveOverrides, varName: string, value: string): ActiveOverrides =>
  updateVariableList(overrides, varName, (inactiveValues) => withoutValue(inactiveValues, value));

// À appeler quand une variable entière est supprimée.
export const removeVariableOverrides = (overrides: ActiveOverrides, varName: string): ActiveOverrides => {
  if (!(varName in overrides.variables)) return overrides;
  const variables = { ...overrides.variables };
  delete variables[varName];
  return { ...overrides, variables };
};

const pruneHashmapEntry = (entry: HashmapActiveOverride): HashmapActiveOverride | null => {
  const inactive_keys = entry.inactive_keys && entry.inactive_keys.length > 0 ? entry.inactive_keys : undefined;

  const inactiveValueEntries = Object.entries(entry.inactive_values || {}).filter(([, values]) => values.length > 0);
  const inactive_values = inactiveValueEntries.length > 0 ? Object.fromEntries(inactiveValueEntries) : undefined;

  if (!inactive_keys && !inactive_values) return null;

  const pruned: HashmapActiveOverride = {};
  if (inactive_keys) pruned.inactive_keys = inactive_keys;
  if (inactive_values) pruned.inactive_values = inactive_values;
  return pruned;
};

const updateHashmapEntry = (
  overrides: ActiveOverrides,
  mapName: string,
  mutate: (entry: HashmapActiveOverride) => HashmapActiveOverride
): ActiveOverrides => {
  const nextEntry = pruneHashmapEntry(mutate(overrides.hashmaps[mapName] || {}));
  const hashmaps = { ...overrides.hashmaps };
  if (nextEntry === null) {
    delete hashmaps[mapName];
  } else {
    hashmaps[mapName] = nextEntry;
  }
  return { ...overrides, hashmaps };
};

export const toggleHashmapKeyActive = (overrides: ActiveOverrides, mapName: string, key: string): ActiveOverrides => {
  const currentlyActive = isHashmapKeyActive(overrides, mapName, key);
  return updateHashmapEntry(overrides, mapName, (entry) => ({
    ...entry,
    inactive_keys: currentlyActive
      ? [...(entry.inactive_keys || []), key]
      : withoutValue(entry.inactive_keys || [], key)
  }));
};

// Bascule l'exception individuelle de cette valeur, indépendamment de l'état
// (actif ou non) de sa clé parente — voir isHashmapValueActive pour l'effectif
// cumulé des deux niveaux.
export const toggleHashmapValueActive = (
  overrides: ActiveOverrides,
  mapName: string,
  key: string,
  value: string
): ActiveOverrides => {
  const existingValues = overrides.hashmaps[mapName]?.inactive_values?.[key] || [];
  const currentlyActiveIndividually = !existingValues.includes(value);
  const nextValuesForKey = currentlyActiveIndividually
    ? [...existingValues, value]
    : withoutValue(existingValues, value);

  return updateHashmapEntry(overrides, mapName, (entry) => {
    const inactive_values = { ...(entry.inactive_values || {}) };
    if (nextValuesForKey.length === 0) {
      delete inactive_values[key];
    } else {
      inactive_values[key] = nextValuesForKey;
    }
    return { ...entry, inactive_values };
  });
};

// À appeler quand une clé de hashmap est supprimée.
export const removeHashmapKeyOverrides = (overrides: ActiveOverrides, mapName: string, key: string): ActiveOverrides =>
  updateHashmapEntry(overrides, mapName, (entry) => {
    const inactive_values = entry.inactive_values ? { ...entry.inactive_values } : undefined;
    if (inactive_values) delete inactive_values[key];
    return {
      inactive_keys: withoutValue(entry.inactive_keys || [], key),
      inactive_values
    };
  });

// À appeler quand une valeur de la liste d'une clé de hashmap est supprimée.
export const pruneHashmapOverrideValue = (
  overrides: ActiveOverrides,
  mapName: string,
  key: string,
  value: string
): ActiveOverrides =>
  updateHashmapEntry(overrides, mapName, (entry) => {
    const existingValues = entry.inactive_values?.[key];
    if (!existingValues) return entry;

    const nextValues = withoutValue(existingValues, value);
    const inactive_values = { ...entry.inactive_values };
    if (nextValues.length === 0) {
      delete inactive_values[key];
    } else {
      inactive_values[key] = nextValues;
    }
    return { ...entry, inactive_values };
  });

// À appeler quand un hashmap entier est supprimé.
export const removeHashmapOverrides = (overrides: ActiveOverrides, mapName: string): ActiveOverrides => {
  if (!(mapName in overrides.hashmaps)) return overrides;
  const hashmaps = { ...overrides.hashmaps };
  delete hashmaps[mapName];
  return { ...overrides, hashmaps };
};
