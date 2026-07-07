// Import de Variables/HashMaps depuis une route API distante. Le flux est en
// deux temps : fetchRemoteData() récupère et valide la forme des données,
// puis computeImportDiff()/applyImport() gèrent la fusion avec les données
// locales — voir ApiImportPanel.tsx pour l'UI de résolution des conflits.

import type { FlowVariables, FlowHashmaps } from '../types/flow';

export type ImportResolution = 'local' | 'remote' | 'merge-local' | 'merge-remote';

export interface RemoteData {
  variables: FlowVariables;
  hashmaps: FlowHashmaps;
}

export interface VariableConflict {
  name: string;
  localValues: string[];
  remoteValues: string[];
}

export interface HashmapConflict {
  name: string;
  localMap: Record<string, string[]>;
  remoteMap: Record<string, string[]>;
}

export interface ImportDiff {
  variableConflicts: VariableConflict[];
  variableAdditions: string[];
  hashmapConflicts: HashmapConflict[];
  hashmapAdditions: string[];
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

const parseVariables = (raw: unknown): FlowVariables => {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error("Le champ \"variables\" doit être un objet { nom: [valeurs] }.");
  }
  const result: FlowVariables = {};
  for (const [name, values] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(values) || !values.every((v) => typeof v === 'string')) {
      throw new Error(`La variable "${name}" doit être un tableau de chaînes.`);
    }
    result[name] = values;
  }
  return result;
};

const parseHashmaps = (raw: unknown): FlowHashmaps => {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error("Le champ \"hashmaps\" doit être un objet { nom: { clé: [valeurs] } }.");
  }
  const result: FlowHashmaps = {};
  for (const [name, map] of Object.entries(raw as Record<string, unknown>)) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      throw new Error(`Le hashmap "${name}" doit être un objet { clé: [valeurs] }.`);
    }
    const parsedMap: Record<string, string[]> = {};
    for (const [key, values] of Object.entries(map as Record<string, unknown>)) {
      if (!Array.isArray(values) || !values.every((v) => typeof v === 'string')) {
        throw new Error(`La clé "${key}" du hashmap "${name}" doit être un tableau de chaînes.`);
      }
      parsedMap[key] = values;
    }
    result[name] = parsedMap;
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
  remote: RemoteData
): ImportDiff => {
  const variableConflicts: VariableConflict[] = [];
  const variableAdditions: string[] = [];
  for (const [name, remoteValues] of Object.entries(remote.variables)) {
    const localValues = localVariables[name];
    if (!localValues) {
      variableAdditions.push(name);
    } else if (!sameStringSet(localValues, remoteValues)) {
      variableConflicts.push({ name, localValues, remoteValues });
    }
  }

  const hashmapConflicts: HashmapConflict[] = [];
  const hashmapAdditions: string[] = [];
  for (const [name, remoteMap] of Object.entries(remote.hashmaps)) {
    const localMap = localHashmaps[name];
    if (!localMap) {
      hashmapAdditions.push(name);
    } else if (!sameHashmap(localMap, remoteMap)) {
      hashmapConflicts.push({ name, localMap, remoteMap });
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

// Les clés absentes de *Resolutions sont soit des additions pures (pas de
// conflit), soit — en théorie seulement — un conflit non résolu ; dans ce
// dernier cas on retombe sur 'merge-remote', le choix le moins destructeur.
export const applyImport = (
  localVariables: FlowVariables,
  localHashmaps: FlowHashmaps,
  remote: RemoteData,
  variableResolutions: Record<string, ImportResolution>,
  hashmapResolutions: Record<string, ImportResolution>
): { variables: FlowVariables; hashmaps: FlowHashmaps } => {
  const variables: FlowVariables = { ...localVariables };
  for (const [name, remoteValues] of Object.entries(remote.variables)) {
    const localValues = localVariables[name];
    if (!localValues) {
      variables[name] = remoteValues;
      continue;
    }
    variables[name] = resolveArray(localValues, remoteValues, variableResolutions[name] ?? 'merge-remote');
  }

  const hashmaps: FlowHashmaps = { ...localHashmaps };
  for (const [name, remoteMap] of Object.entries(remote.hashmaps)) {
    const localMap = localHashmaps[name];
    if (!localMap) {
      hashmaps[name] = remoteMap;
      continue;
    }
    hashmaps[name] = resolveHashmap(localMap, remoteMap, hashmapResolutions[name] ?? 'merge-remote');
  }

  return { variables, hashmaps };
};
