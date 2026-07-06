// Accès disque réel pour le Studio, via la File System Access API (Chrome/Edge/Opera
// uniquement — voir PLAN_STUDIO.md, aucun mode dégradé). C'est la seule brique dont
// dépendent l'Asset Repository et le Build System : sélection/persistance du dossier de
// ressources, parcours récursif, hash SHA-256, écriture de fichiers générés.

const DB_NAME = 'agroflux-studio';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const RESOURCES_DIRECTORY_KEY = 'resources-directory';

export const isFileSystemAccessSupported = (): boolean =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const requestProjectDirectory = async (
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<FileSystemDirectoryHandle> => {
  if (!isFileSystemAccessSupported()) {
    throw new Error(
      "Ce navigateur ne supporte pas la File System Access API. Utilisez Chrome, Edge ou Opera."
    );
  }
  return window.showDirectoryPicker({ mode });
};

const openHandleStore = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const persistDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  const db = await openHandleStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, RESOURCES_DIRECTORY_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

export const restoreDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openHandleStore();
  try {
    return await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(RESOURCES_DIRECTORY_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
};

/**
 * Vérifie (et si besoin redemande) la permission sur un handle persisté : après
 * restauration depuis IndexedDB, le navigateur exige une nouvelle confirmation de
 * l'utilisateur avant tout accès réel au dossier.
 */
export const verifyPermission = async (
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> => {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode };
  if ((await handle.queryPermission(descriptor)) === 'granted') return true;
  if ((await handle.requestPermission(descriptor)) === 'granted') return true;
  return false;
};

/**
 * Parcourt récursivement un dossier et retourne l'ensemble de ses fichiers, indexés par
 * chemin relatif ("audio/fon/produits/mais.mp3") — jamais de chemin absolu.
 */
export const walkDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
  prefix = ''
): Promise<Map<string, FileSystemFileHandle>> => {
  const files = new Map<string, FileSystemFileHandle>();

  for await (const [name, handle] of dirHandle.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'file') {
      files.set(relativePath, handle);
    } else {
      const nested = await walkDirectory(handle, relativePath);
      nested.forEach((fileHandle, path) => files.set(path, fileHandle));
    }
  }

  return files;
};

const bufferToHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

// Exporté séparément (et non juste interne à hashFile) pour que l'Asset Repository
// puisse hasher un contenu déjà lu en mémoire (le manifest a aussi besoin de la
// taille et de la date de modification du même fichier — un seul `getFile()`
// suffit alors, au lieu d'en refaire un pour chaque information).
export const hashBuffer = async (data: BufferSource): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(digest);
};

export const hashFile = async (fileHandle: FileSystemFileHandle): Promise<string> => {
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  return hashBuffer(buffer);
};

export const readFileSize = async (fileHandle: FileSystemFileHandle): Promise<number> => {
  const file = await fileHandle.getFile();
  return file.size;
};

/**
 * Écrit un fichier texte à un chemin relatif donné, en créant les sous-dossiers manquants
 * au passage (getDirectoryHandle({ create: true })).
 */
export const writeTextFile = async (
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string,
  content: string
): Promise<void> => {
  const segments = relativePath.split('/').filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error(`Chemin de fichier invalide : "${relativePath}"`);
  }

  let currentDir = dirHandle;
  for (const segment of segments) {
    currentDir = await currentDir.getDirectoryHandle(segment, { create: true });
  }

  const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};
