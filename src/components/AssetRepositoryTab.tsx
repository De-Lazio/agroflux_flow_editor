import { useState } from 'react';
import { FolderOpen, ScanLine, Loader2 } from 'lucide-react';
import { verifyPermission, RESOURCES_DIRECTORY_KEY } from '../utils/fsAccess';
import { useDirectoryHandle } from '../hooks/useDirectoryHandle';
import { buildManifest, buildRepository } from '../utils/assetRepository';
import type { Manifest, Repository } from '../utils/assetRepository';
import { reconcileResources } from '../utils/resourceReconciliation';
import { validateFlow } from '../utils/validator';
import { formatBytes, truncateHash } from '../utils/format';
import ReconciliationLists from './ReconciliationLists';
import type { FlowData } from '../types/flow';

interface AssetRepositoryTabProps {
  getCurrentFlow: () => FlowData;
}

const AssetRepositoryTab = ({ getCurrentFlow }: AssetRepositoryTabProps) => {
  const { handle: dirHandle, connect } = useDirectoryHandle(RESOURCES_DIRECTORY_KEY, 'read');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [orphaned, setOrphaned] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetScanResults = () => {
    setManifest(null);
    setRepository(null);
    setMissing([]);
    setOrphaned([]);
  };

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
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

  return (
    <div className="space-y-6">
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

          <ReconciliationLists missing={missing} orphaned={orphaned} />
        </>
      )}
    </div>
  );
};

export default AssetRepositoryTab;
