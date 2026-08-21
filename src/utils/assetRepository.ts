import { walkDirectory, hashBuffer } from './fsAccess';

// snake_case partout (cohérent avec flow.json / backend Laravel / Flutter — voir
// PLAN_STUDIO.md, Phase 3.1). Aucun champ ne contient ni ne contiendra jamais
// d'URL : le manifest ne connaît que des chemins relatifs, la reconstruction
// base_url + path est une responsabilité de Flutter/backend.
export interface ManifestEntry {
  path: string;
  hash: string;
  file_size: number;
  resource_type: 'audio' | 'image';
  last_modified: string;
}

export interface Manifest {
  generated_at: string;
  entries: ManifestEntry[];
}

export interface Repository {
  repository_hash: string;
  generated_at: string;
  entry_count: number;
}

// Dérivé du premier segment du chemin, seule source de vérité pour le type de
// ressource (voir la convention officielle : audio/{lang}/..., images/...).
// Un fichier hors de ces deux dossiers n'est pas une ressource du Studio — il
// est ignoré plutôt que de forcer un type arbitraire.
const RESOURCE_TYPE_BY_ROOT_SEGMENT: Record<string, ManifestEntry['resource_type']> = {
  audio: 'audio',
  images: 'image'
};

// Exporté pour que le Générateur de ressources sache, à partir d'un chemin
// attendu (issu de validation.report.audios/images), s'il doit produire une
// image ou un audio — sans dupliquer la convention audio/images/ ailleurs.
export const resourceTypeForPath = (path: string): ManifestEntry['resource_type'] | undefined =>
  RESOURCE_TYPE_BY_ROOT_SEGMENT[path.split('/')[0]];

/**
 * Scanne réellement le dossier de ressources choisi par l'utilisateur : un
 * fichier présent = une entrée, avec son hash SHA-256, sa taille et sa date de
 * modification. Aucune supposition sur ce qui est "attendu" par le flow — ça,
 * c'est le rôle de `reconcileResources` (Phase 1.2), pas de ce scan.
 */
export const buildManifest = async (dirHandle: FileSystemDirectoryHandle): Promise<Manifest> => {
  const files = await walkDirectory(dirHandle);
  const entries: ManifestEntry[] = [];

  for (const [path, fileHandle] of files) {
    const resourceType = resourceTypeForPath(path);
    if (!resourceType) continue;

    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();

    entries.push({
      path,
      hash: await hashBuffer(buffer),
      file_size: file.size,
      resource_type: resourceType,
      last_modified: new Date(file.lastModified).toISOString()
    });
  }

  return { generated_at: new Date().toISOString(), entries };
};

/**
 * Hash global du dépôt : déterministe (même ensemble de fichiers = même hash,
 * peu importe l'ordre de scan), sensible au moindre changement de contenu, de
 * taille ou de chemin. Flutter compare ce hash à celui fourni par le backend
 * pour savoir s'il doit retélécharger un manifest à jour.
 *
 * Nécessairement asynchrone malgré la signature de PLAN_STUDIO.md : SHA-256
 * (Web Crypto) n'existe pas en version synchrone dans le navigateur.
 */
export const computeRepositoryHash = (manifest: Manifest): Promise<string> => {
  const sorted = [...manifest.entries].sort((a, b) => a.path.localeCompare(b.path));
  const concatenated = sorted.map((entry) => `${entry.path}|${entry.hash}|${entry.file_size}`).join('\n');
  return hashBuffer(new TextEncoder().encode(concatenated));
};

export const buildRepository = async (manifest: Manifest): Promise<Repository> => ({
  repository_hash: await computeRepositoryHash(manifest),
  generated_at: manifest.generated_at,
  entry_count: manifest.entries.length
});
