// Import de Variables/HashMaps (avec leur état actif) depuis une route API
// distante. Le flux est en deux temps : fetchRemoteData() récupère et valide
// la forme des données, puis computeImportDiff()/applyImport() gèrent la
// fusion avec les données locales (valeurs ET active_overrides) — voir
// ApiImportPanel.tsx pour l'UI de résolution des conflits, et
// API_IMPORT_FORMAT.md pour le format exact attendu côté backend.

import type { ActiveOverrides, FlowHashmaps, FlowVariables, HashmapActiveOverride } from '../types/flow';

export type ImportResolution = 'local' | 'remote' | 'merge-local' | 'merge-remote';

// Chaque valeur/clé porte directement son état actif (true/false) plutôt
// qu'un simple tableau — c'est la forme la plus simple à produire pour le
// backend (un objet, pas une structure imbriquée supplémentaire).
export interface RemoteVariablePayload {
  [value: string]: boolean;
}

export interface RemoteHashmapKeyPayload {
  active: boolean;
  values: Record<string, boolean>;
}

export interface RemoteData {
  variables: Record<string, RemoteVariablePayload>;
  hashmaps: Record<string, Record<string, RemoteHashmapKeyPayload>>;
}

export interface VariableConflict {
  name: string;
  localValues: string[];
  remoteValues: string[];
  localInactive: string[];
  remoteInactive: string[];
}

export interface HashmapConflict {
  name: string;
  localMap: Record<string, string[]>;
  remoteMap: Record<string, string[]>;
  localInactiveKeys: string[];
  remoteInactiveKeys: string[];
  localInactiveValues: Record<string, string[]>;
  remoteInactiveValues: Record<string, string[]>;
}

export interface ImportDiff {
  variableConflicts: VariableConflict[];
  variableAdditions: string[];
  hashmapConflicts: HashmapConflict[];
  hashmapAdditions: string[];
}

export interface ImportResult {
  variables: FlowVariables;
  hashmaps: FlowHashmaps;
  activeOverrides: ActiveOverrides;
}

const sameStringSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
};

const sameHashmap = (a: Record<string, string[]>, b: Record<string, string[]>): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => b[k] !== undefined && sameStringSet(a[k], b[k]));
};

// true si au moins une valeur du payload distant a un état actif différent
// de ce que dit l'overlay local (absence de localInactive = actif).
const activeStateDiffers = (localInactive: string[], remoteActive: Record<string, boolean>): boolean => {
  const localInactiveSet = new Set(localInactive);
  return Object.entries(remoteActive).some(([value, active]) => localInactiveSet.has(value) === active);
};

const hashmapActiveStateDiffers = (
  localOverride: HashmapActiveOverride | undefined,
  remoteKeyMap: Record<string, RemoteHashmapKeyPayload>
): boolean => {
  const remoteKeyActive: Record<string, boolean> = Object.fromEntries(
    Object.entries(remoteKeyMap).map(([key, kp]) => [key, kp.active])
  );
  if (activeStateDiffers(localOverride?.inactive_keys || [], remoteKeyActive)) return true;

  return Object.entries(remoteKeyMap).some(([key, kp]) =>
    activeStateDiffers(localOverride?.inactive_values?.[key] || [], kp.values)
  );
};

const mergeStringArrays = (primary: string[], secondary: string[]): string[] => {
  const merged = [...primary];
  const seen = new Set(primary);
  for (const value of secondary) {
    if (!seen.has(value)) {
      seen.add(value);
      merged.push(value);
    }
  }
  return merged;
};

const mergeHashmapEntries = (
  primary: Record<string, string[]>,
  secondary: Record<string, string[]>
): Record<string, string[]> => {
  const result: Record<string, string[]> = { ...primary };
  for (const [key, values] of Object.entries(secondary)) {
    result[key] = result[key] ? mergeStringArrays(result[key], values) : [...values];
  }
  return result;
};

// Fusionne l'état actif d'un ensemble de valeurs (variable, clés de hashmap,
// ou valeurs d'une clé) selon la même résolution que la liste de valeurs
// elle-même : 'local'/'remote' gardent tel quel un des deux côtés ;
// 'merge-local' fait gagner l'état local pour toute valeur déjà connue en
// local (les valeurs nouvelles, apportées par le distant, adoptent son état
// faute d'alternative) ; 'merge-remote' fait l'inverse.
const mergeActiveState = (
  localValues: string[],
  localInactive: string[],
  remoteActive: Record<string, boolean>,
  resolution: ImportResolution
): string[] => {
  const localValuesSet = new Set(localValues);
  const remoteValuesSet = new Set(Object.keys(remoteActive));
  const remoteInactive = Object.entries(remoteActive).filter(([, active]) => !active).map(([v]) => v);

  switch (resolution) {
    case 'local':
      return localInactive;
    case 'remote':
      return remoteInactive;
    case 'merge-local': {
      const result = new Set(localInactive);
      remoteInactive.forEach((v) => { if (!localValuesSet.has(v)) result.add(v); });
      return [...result];
    }
    case 'merge-remote': {
      const result = new Set(remoteInactive);
      localInactive.forEach((v) => { if (!remoteValuesSet.has(v)) result.add(v); });
      return [...result];
    }
  }
};

const parseVariablePayload = (name: string, raw: unknown): RemoteVariablePayload => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`La variable "${name}" doit être un objet { valeur: true/false }.`);
  }
  const result: RemoteVariablePayload = {};
  for (const [value, active] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof active !== 'boolean') {
      throw new Error(`La valeur "${value}" de la variable "${name}" doit être un booléen (true = actif, false = inactif).`);
    }
    result[value] = active;
  }
  return result;
};

const parseVariables = (raw: unknown): Record<string, RemoteVariablePayload> => {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error("Le champ \"variables\" doit être un objet { nom: { valeur: true/false } }.");
  }
  const result: Record<string, RemoteVariablePayload> = {};
  for (const [name, payload] of Object.entries(raw as Record<string, unknown>)) {
    result[name] = parseVariablePayload(name, payload);
  }
  return result;
};

const parseHashmapKeyPayload = (mapName: string, key: string, raw: unknown): RemoteHashmapKeyPayload => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`La clé "${key}" du hashmap "${mapName}" doit être un objet { active, values }.`);
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.active !== 'boolean') {
    throw new Error(`La clé "${key}" du hashmap "${mapName}" doit avoir un champ "active" booléen.`);
  }
  if (!body.values || typeof body.values !== 'object' || Array.isArray(body.values)) {
    throw new Error(`La clé "${key}" du hashmap "${mapName}" doit avoir un champ "values" objet { valeur: true/false }.`);
  }
  const values: Record<string, boolean> = {};
  for (const [value, active] of Object.entries(body.values as Record<string, unknown>)) {
    if (typeof active !== 'boolean') {
      throw new Error(`La valeur "${value}" de la clé "${key}" (hashmap "${mapName}") doit être un booléen.`);
    }
    values[value] = active;
  }
  return { active: body.active, values };
};

const parseHashmaps = (raw: unknown): Record<string, Record<string, RemoteHashmapKeyPayload>> => {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error("Le champ \"hashmaps\" doit être un objet { nom: { clé: { active, values } } }.");
  }
  const result: Record<string, Record<string, RemoteHashmapKeyPayload>> = {};
  for (const [mapName, map] of Object.entries(raw as Record<string, unknown>)) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      throw new Error(`Le hashmap "${mapName}" doit être un objet { clé: { active, values } }.`);
    }
    const parsedMap: Record<string, RemoteHashmapKeyPayload> = {};
    for (const [key, keyPayload] of Object.entries(map as Record<string, unknown>)) {
      parsedMap[key] = parseHashmapKeyPayload(mapName, key, keyPayload);
    }
    result[mapName] = parsedMap;
  }
  return result;
};

// Exportée pour être testée indépendamment de fetch().
export const parseRemoteData = (raw: unknown): RemoteData => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error("La réponse de l'API doit être un objet JSON.");
  }
  const body = raw as Record<string, unknown>;
  return {
    variables: parseVariables(body.variables),
    hashmaps: parseHashmaps(body.hashmaps)
  };
};

export const fetchRemoteData = async (url: string, token?: string): Promise<RemoteData> => {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  } catch {
    throw new Error("Impossible de contacter l'API. Vérifiez l'URL et votre connexion.");
  }

  if (!response.ok) {
    throw new Error(`L'API a répondu avec le statut ${response.status} ${response.statusText}.`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error("La réponse de l'API n'est pas un JSON valide.");
  }

  return parseRemoteData(json);
};

export const computeImportDiff = (
  localVariables: FlowVariables,
  localHashmaps: FlowHashmaps,
  localActiveOverrides: ActiveOverrides,
  remote: RemoteData
): ImportDiff => {
  const variableConflicts: VariableConflict[] = [];
  const variableAdditions: string[] = [];

  for (const [name, remotePayload] of Object.entries(remote.variables)) {
    const remoteValues = Object.keys(remotePayload);
    const localValues = localVariables[name];

    if (!localValues) {
      variableAdditions.push(name);
      continue;
    }

    const localInactive = localActiveOverrides.variables[name] || [];
    const remoteInactive = remoteValues.filter((v) => remotePayload[v] === false);

    if (!sameStringSet(localValues, remoteValues) || activeStateDiffers(localInactive, remotePayload)) {
      variableConflicts.push({ name, localValues, remoteValues, localInactive, remoteInactive });
    }
  }

  const hashmapConflicts: HashmapConflict[] = [];
  const hashmapAdditions: string[] = [];

  for (const [name, remoteKeyMap] of Object.entries(remote.hashmaps)) {
    const remoteMap: Record<string, string[]> = Object.fromEntries(
      Object.entries(remoteKeyMap).map(([key, kp]) => [key, Object.keys(kp.values)])
    );
    const localMap = localHashmaps[name];

    if (!localMap) {
      hashmapAdditions.push(name);
      continue;
    }

    const localOverride = localActiveOverrides.hashmaps[name];

    if (!sameHashmap(localMap, remoteMap) || hashmapActiveStateDiffers(localOverride, remoteKeyMap)) {
      const remoteInactiveKeys = Object.entries(remoteKeyMap).filter(([, kp]) => !kp.active).map(([k]) => k);
      const remoteInactiveValues: Record<string, string[]> = {};
      Object.entries(remoteKeyMap).forEach(([key, kp]) => {
        const inactiveForKey = Object.entries(kp.values).filter(([, active]) => !active).map(([v]) => v);
        if (inactiveForKey.length > 0) remoteInactiveValues[key] = inactiveForKey;
      });

      hashmapConflicts.push({
        name,
        localMap,
        remoteMap,
        localInactiveKeys: localOverride?.inactive_keys || [],
        remoteInactiveKeys,
        localInactiveValues: localOverride?.inactive_values || {},
        remoteInactiveValues
      });
    }
  }

  return { variableConflicts, variableAdditions, hashmapConflicts, hashmapAdditions };
};

const resolveArray = (local: string[], remote: string[], resolution: ImportResolution): string[] => {
  switch (resolution) {
    case 'local': return local;
    case 'remote': return remote;
    case 'merge-local': return mergeStringArrays(local, remote);
    case 'merge-remote': return mergeStringArrays(remote, local);
  }
};

const resolveHashmap = (
  local: Record<string, string[]>,
  remote: Record<string, string[]>,
  resolution: ImportResolution
): Record<string, string[]> => {
  switch (resolution) {
    case 'local': return local;
    case 'remote': return remote;
    case 'merge-local': return mergeHashmapEntries(local, remote);
    case 'merge-remote': return mergeHashmapEntries(remote, local);
  }
};

// Les clés absentes de *Resolutions sont des additions pures (pas de conflit
// présenté à l'utilisateur) : retombent sur 'merge-remote', ce qui revient
// mathématiquement à "prendre le distant" quand il n'y a rien en local.
export const applyImport = (
  localVariables: FlowVariables,
  localHashmaps: FlowHashmaps,
  localActiveOverrides: ActiveOverrides,
  remote: RemoteData,
  variableResolutions: Record<string, ImportResolution>,
  hashmapResolutions: Record<string, ImportResolution>
): ImportResult => {
  const variables: FlowVariables = { ...localVariables };
  const overrideVariables: Record<string, string[]> = { ...localActiveOverrides.variables };

  for (const [name, remotePayload] of Object.entries(remote.variables)) {
    const remoteValues = Object.keys(remotePayload);
    const localValues = localVariables[name] || [];
    const resolution = variableResolutions[name] ?? 'merge-remote';

    variables[name] = resolveArray(localValues, remoteValues, resolution);

    const localInactive = localActiveOverrides.variables[name] || [];
    const nextInactive = mergeActiveState(localValues, localInactive, remotePayload, resolution);
    if (nextInactive.length > 0) {
      overrideVariables[name] = nextInactive;
    } else {
      delete overrideVariables[name];
    }
  }

  const hashmaps: FlowHashmaps = { ...localHashmaps };
  const overrideHashmaps: Record<string, HashmapActiveOverride> = { ...localActiveOverrides.hashmaps };

  for (const [name, remoteKeyMap] of Object.entries(remote.hashmaps)) {
    const remoteMap: Record<string, string[]> = Object.fromEntries(
      Object.entries(remoteKeyMap).map(([key, kp]) => [key, Object.keys(kp.values)])
    );
    const localMap = localHashmaps[name] || {};
    const resolution = hashmapResolutions[name] ?? 'merge-remote';

    hashmaps[name] = resolveHashmap(localMap, remoteMap, resolution);

    const localOverride = localActiveOverrides.hashmaps[name];
    const remoteKeyActive: Record<string, boolean> = Object.fromEntries(
      Object.entries(remoteKeyMap).map(([key, kp]) => [key, kp.active])
    );
    const inactive_keys = mergeActiveState(Object.keys(localMap), localOverride?.inactive_keys || [], remoteKeyActive, resolution);

    const inactive_values: Record<string, string[]> = { ...(localOverride?.inactive_values || {}) };
    Object.entries(remoteKeyMap).forEach(([key, kp]) => {
      const localValuesForKey = localMap[key] || [];
      const localInactiveForKey = localOverride?.inactive_values?.[key] || [];
      const nextForKey = mergeActiveState(localValuesForKey, localInactiveForKey, kp.values, resolution);
      if (nextForKey.length > 0) {
        inactive_values[key] = nextForKey;
      } else {
        delete inactive_values[key];
      }
    });

    const nextEntry: HashmapActiveOverride = {};
    if (inactive_keys.length > 0) nextEntry.inactive_keys = inactive_keys;
    if (Object.keys(inactive_values).length > 0) nextEntry.inactive_values = inactive_values;

    if (Object.keys(nextEntry).length > 0) {
      overrideHashmaps[name] = nextEntry;
    } else {
      delete overrideHashmaps[name];
    }
  }

  return {
    variables,
    hashmaps,
    activeOverrides: { variables: overrideVariables, hashmaps: overrideHashmaps }
  };
};
