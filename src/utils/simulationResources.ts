// Résolution des ressources audio/image du Simulateur (voir simulation_plan.md
// §4) : construit un index du dossier de ressources déjà connecté au Studio,
// puis résout le chemin attendu pour une valeur de variable ou de hashmap —
// avec repli "recherche par nom de fichier" pour les hashmaps listés dans
// hashmaps_no_resources (aucun chemin canonique n'existe pour eux, par
// construction : voir resourceInventory.ts, buildHashmapResources).

import { walkDirectory } from './fsAccess';
import { DEFAULT_AUDIO_FORMAT, DEFAULT_IMAGE_FORMAT } from './resourceInventory';
import type { FlowData } from '../types/flow';

export interface ResourceIndex {
  // Chemin relatif complet ("audio/fon/produits/mais.mp3") -> handle réel.
  byPath: Map<string, FileSystemFileHandle>;
  // Nom de fichier seul ("mais.mp3") -> tous les chemins qui s'y terminent,
  // utilisé uniquement par la recherche best-effort ci-dessous.
  byBasename: Map<string, string[]>;
}

const basenameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

// Pure et exportée séparément de buildResourceIndex : permet de construire un
// ResourceIndex de test sans FileSystemDirectoryHandle réel (voir
// simulationResources.test.ts), et évite de dupliquer cette logique.
export const indexByBasename = (paths: Iterable<string>): Map<string, string[]> => {
  const index = new Map<string, string[]>();
  for (const path of paths) {
    const basename = basenameOf(path);
    const list = index.get(basename);
    if (list) list.push(path);
    else index.set(basename, [path]);
  }
  return index;
};

export const buildResourceIndex = async (dirHandle: FileSystemDirectoryHandle): Promise<ResourceIndex> => {
  const byPath = await walkDirectory(dirHandle);
  return { byPath, byBasename: indexByBasename(byPath.keys()) };
};

export type ResourceLookupMethod = 'canonical' | 'best-effort' | 'not-found';

export interface ResourceLookup {
  path: string | null;
  method: ResourceLookupMethod;
}

const NOT_FOUND: ResourceLookup = { path: null, method: 'not-found' };

const audioFormatOf = (flow: FlowData): string => flow.resource_formats?.audio || DEFAULT_AUDIO_FORMAT;
const imageFormatOf = (flow: FlowData): string => flow.resource_formats?.image || DEFAULT_IMAGE_FORMAT;
const folderOf = (flow: FlowData, ownerName: string): string => flow.audio_mappings?.[ownerName] || ownerName;

const isExcludedHashmap = (flow: FlowData, ownerName: string, key: string | undefined): boolean =>
  key !== undefined && (flow.hashmaps_no_resources || []).includes(ownerName);

// Recherche par nom de fichier dans tout l'index, restreinte à un préfixe de
// racine (audio/{langue}/ ou images/) pour ne jamais confondre un audio et
// une image homonymes. Premier résultat trouvé, sans notion d'ordre garanti
// au-delà de celui de walkDirectory — acceptable ici car ce n'est qu'un
// repli "au mieux", jamais la résolution canonique.
const bestEffortLookup = (index: ResourceIndex, value: string, format: string, rootPrefix: string): ResourceLookup => {
  const basename = `${value}.${format}`;
  const candidates = (index.byBasename.get(basename) || []).filter((p) => p.startsWith(rootPrefix));
  return candidates.length > 0 ? { path: candidates[0], method: 'best-effort' } : NOT_FOUND;
};

/**
 * Résout le chemin audio attendu pour une valeur de variable (`key`
 * `undefined`) ou de hashmap (`key` = la clé du hashmap, ex. un département).
 * Reprend exactement la formule de `resourceInventory.ts`.
 */
export const resolveAudioPath = (
  index: ResourceIndex,
  flow: FlowData,
  ownerName: string,
  key: string | undefined,
  value: string,
  language: string
): ResourceLookup => {
  const format = audioFormatOf(flow);

  if (!isExcludedHashmap(flow, ownerName, key)) {
    const folder = folderOf(flow, ownerName);
    const path = key !== undefined
      ? `audio/${language}/${folder}/${key}/${value}.${format}`
      : `audio/${language}/${folder}/${value}.${format}`;
    return index.byPath.has(path) ? { path, method: 'canonical' } : NOT_FOUND;
  }

  return bestEffortLookup(index, value, format, `audio/${language}/`);
};

/** Symétrique de resolveAudioPath, sans dimension langue (une image ne dépend jamais de la langue). */
export const resolveImagePath = (
  index: ResourceIndex,
  flow: FlowData,
  ownerName: string,
  key: string | undefined,
  value: string
): ResourceLookup => {
  const format = imageFormatOf(flow);

  if (!isExcludedHashmap(flow, ownerName, key)) {
    const folder = folderOf(flow, ownerName);
    const path = key !== undefined
      ? `images/${folder}/${key}/${value}.${format}`
      : `images/${folder}/${value}.${format}`;
    return index.byPath.has(path) ? { path, method: 'canonical' } : NOT_FOUND;
  }

  return bestEffortLookup(index, value, format, 'images/');
};

/**
 * Chemin (best-effort, convention non garantie) de l'audio d'une option de
 * nœud `root` : "questions/{id}.{format}" — aucun champ du schéma ne le
 * déclare explicitement, voir simulation_plan.md §3.2.
 */
export const resolveRootOptionAudioPath = (index: ResourceIndex, flow: FlowData, optionId: string): ResourceLookup => {
  const format = audioFormatOf(flow);
  const path = `questions/${optionId}.${format}`;
  return index.byPath.has(path) ? { path, method: 'canonical' } : NOT_FOUND;
};

// ---------------------------------------------------------------------------
// Lecture réelle (Phase 5) : les chemins déjà écrits en toutes lettres dans le
// flow (audio_prompt d'un nœud, audio.sequence/fallback, et plus tard chaque
// entrée "audios" d'une réponse audio_sequence) sont des chemins littéraux —
// même convention que le validator (validator.ts ne les préfixe jamais par
// "audio/{langue}/"), donc une simple présence dans l'index suffit ici.
// ---------------------------------------------------------------------------

export const resolveLiteralPath = (index: ResourceIndex, path: string): ResourceLookup =>
  index.byPath.has(path) ? { path, method: 'canonical' } : NOT_FOUND;

/**
 * Lit le fichier réel derrière un chemin déjà résolu et retourne une URL
 * `blob:` jouable/affichable (`<audio src>`, `<img src>`). L'appelant est
 * responsable de `URL.revokeObjectURL` une fois l'URL périmée.
 */
export const readResourceObjectUrl = async (index: ResourceIndex, path: string): Promise<string | null> => {
  const handle = index.byPath.get(path);
  if (!handle) return null;
  const file = await handle.getFile();
  return URL.createObjectURL(file);
};
