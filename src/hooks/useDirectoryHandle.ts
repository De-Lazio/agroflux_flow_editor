import { useCallback, useEffect, useState } from 'react';
import {
  isFileSystemAccessSupported,
  requestProjectDirectory,
  persistDirectoryHandle,
  restoreDirectoryHandle,
  verifyPermission
} from '../utils/fsAccess';

/**
 * Connexion à un dossier persisté (resources, sortie de build, publication...),
 * partagée par tous les panneaux du Studio qui ont besoin d'un accès disque :
 * restaure silencieusement le dossier de la session précédente au montage (la
 * permission navigateur, elle, doit toujours être reconfirmée), et expose
 * `connect()` pour en choisir un nouveau via le sélecteur natif.
 */
export const useDirectoryHandle = (storageKey: string, mode: 'read' | 'readwrite' = 'read') => {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    if (!isFileSystemAccessSupported()) return;
    let cancelled = false;
    (async () => {
      const restored = await restoreDirectoryHandle(storageKey);
      if (!restored || cancelled) return;
      if (await verifyPermission(restored, mode)) setHandle(restored);
    })();
    return () => { cancelled = true; };
  }, [storageKey, mode]);

  const connect = useCallback(async (): Promise<FileSystemDirectoryHandle> => {
    const newHandle = await requestProjectDirectory(mode);
    await persistDirectoryHandle(newHandle, storageKey);
    setHandle(newHandle);
    return newHandle;
  }, [storageKey, mode]);

  return { handle, connect };
};
