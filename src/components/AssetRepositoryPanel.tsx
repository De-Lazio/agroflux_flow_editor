import { useEffect, useState } from 'react';
import { X, FolderOpen, ScanLine, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  isFileSystemAccessSupported,
  requestProjectDirectory,
  persistDirectoryHandle,
  restoreDirectoryHandle,
  verifyPermission
} from '../utils/fsAccess';
import { buildManifest, buildRepository } from '../utils/assetRepository';
import type { Manifest, Repository } from '../utils/assetRepository';
import { reconcileResources } from '../utils/resourceReconciliation';
import { validateFlow } from '../utils/validator';
import type { FlowData } from '../types/flow';

interface AssetRepositoryPanelProps {
  getCurrentFlow: () => FlowData;
  onClose: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

const truncateHash = (hash: string): string => `${hash.slice(0, 10)}…`;

const AssetRepositoryPanel = ({ getCurrentFlow, onClose }: AssetRepositoryPanelProps) => {
  const supported = isFileSystemAccessSupported();

  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [orphaned, setOrphaned] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reconnexion silencieuse au dossier déjà choisi lors d'une session précédente
  // (handle persisté en IndexedDB) — le navigateur exige quand même une permission
  // à jour, redemandée ici via verifyPermission.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      const restored = await restoreDirectoryHandle();
      if (!restored || cancelled) return;
      if (await verifyPermission(restored, 'read')) {
        setDirHandle(restored);
      }
    })();
    return () => { cancelled = true; };
  }, [supported]);

  const resetScanResults = () => {
    setManifest(null);
    setRepository(null);
    setMissing([]);
    setOrphaned([]);
  };

  const handleConnect = async () => {
    setError(null);
    try {
      const handle = await requestProjectDirectory('read');
      await persistDirectoryHandle(handle);
      setDirHandle(handle);
      resetScanResults();
    } catch (err) {
      // L'utilisateur qui annule le sélecteur de dossier n'est pas une erreur.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError("Impossible d'accéder au dossier sélectionné.");
    }
  };

  const handleScan = async () => {
    if (!dirHandle) return;
    setIsScanning(true);
    setError(null);
    try {
      if (!(await verifyPermission(dirHandle, 'read'))) {
        setError('Permission refusée pour ce dossier — reconnectez-le.');
        return;
      }

      const scannedManifest = await buildManifest(dirHandle);
      const scannedRepository = await buildRepository(scannedManifest);
      const { report } = validateFlow(getCurrentFlow());
      const { missing: expectedMissing, orphaned: diskOrphaned } = reconcileResources(
        [...report.audios, ...report.images],
        scannedManifest.entries.map((entry) => entry.path)
      );

      setManifest(scannedManifest);
      setRepository(scannedRepository);
      setMissing(expectedMissing);
      setOrphaned(diskOrphaned);
    } catch (err) {
      console.error(err);
      setError('Le scan du dossier a échoué.');
    } finally {
      setIsScanning(false);
    }
  };

  if (!supported) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 text-amber-600 mb-3">
            <AlertTriangle size={24} />
            <h2 className="text-lg font-bold">Navigateur non supporté</h2>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            L'Asset Repository a besoin d'un accès réel au disque (File System Access API),
            disponible uniquement sur Chrome, Edge ou Opera. Aucun mode dégradé n'est proposé
            pour cette fonctionnalité.
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg text-white shadow-sm">
              <FolderOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Asset Repository</h2>
              <p className="text-sm text-slate-500">Dépôt de ressources versionné (manifest + hash).</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <FolderOpen size={16} /> {dirHandle ? 'Changer de dossier' : 'Connecter le dossier de ressources'}
            </button>

            {dirHandle && (
              <span className="text-sm text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">
                📁 {dirHandle.name}
              </span>
            )}

            <button
              onClick={handleScan}
              disabled={!dirHandle || isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isScanning ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
              Scanner
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-sm text-red-800 rounded-r-md">
              {error}
            </div>
          )}

          {repository && manifest && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Repository hash</div>
                  <div className="text-sm font-mono text-slate-700">{truncateHash(repository.repository_hash)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fichiers scannés</div>
                  <div className="text-sm font-mono text-slate-700">{repository.entry_count}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Scanné le</div>
                  <div className="text-sm font-mono text-slate-700">{new Date(repository.generated_at).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Manifest ({manifest.entries.length} fichiers)
                </h3>
                <div className="max-h-[200px] overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                  {manifest.entries.map((e) => (
                    <div key={e.path} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                      <span className="font-mono text-slate-700 break-all">{e.path}</span>
                      <span className="flex items-center gap-3 text-slate-400 whitespace-nowrap">
                        <span>{formatBytes(e.file_size)}</span>
                        <span className="font-mono">{truncateHash(e.hash)}</span>
                      </span>
                    </div>
                  ))}
                  {manifest.entries.length === 0 && (
                    <p className="p-3 text-xs text-slate-400 italic">Aucun fichier trouvé sous audio/ ou images/.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <XCircle size={14} /> Manquants ({missing.length})
                  </h3>
                  <div className="max-h-[160px] overflow-y-auto space-y-1">
                    {missing.map((path) => (
                      <div key={path} className="text-[11px] font-mono p-1.5 rounded bg-red-50 text-red-700 break-all">
                        {path}
                      </div>
                    ))}
                    {missing.length === 0 && <p className="text-xs text-slate-400 italic">Aucun.</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Orphelins ({orphaned.length})
                  </h3>
                  <div className="max-h-[160px] overflow-y-auto space-y-1">
                    {orphaned.map((path) => (
                      <div key={path} className="text-[11px] font-mono p-1.5 rounded bg-amber-50 text-amber-700 break-all">
                        {path}
                      </div>
                    ))}
                    {orphaned.length === 0 && <p className="text-xs text-slate-400 italic">Aucun.</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetRepositoryPanel;
