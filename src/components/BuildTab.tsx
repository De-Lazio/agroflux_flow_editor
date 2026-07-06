import { useState } from 'react';
import { Hammer, FolderOpen, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { RESOURCES_DIRECTORY_KEY, BUILD_OUTPUT_DIRECTORY_KEY } from '../utils/fsAccess';
import { useDirectoryHandle } from '../hooks/useDirectoryHandle';
import { runBuild } from '../utils/buildProject';
import type { BuildResult } from '../utils/buildProject';
import ErrorsWarningsSummary from './ErrorsWarningsSummary';
import ReconciliationLists from './ReconciliationLists';
import { truncateHash } from '../utils/format';
import type { FlowData } from '../types/flow';

interface BuildTabProps {
  getCurrentFlow: () => FlowData;
}

const BuildTab = ({ getCurrentFlow }: BuildTabProps) => {
  const { handle: resourcesDirHandle, connect: connectResources } = useDirectoryHandle(RESOURCES_DIRECTORY_KEY, 'read');
  const { handle: outputDirHandle, connect: connectOutput } = useDirectoryHandle(BUILD_OUTPUT_DIRECTORY_KEY, 'readwrite');

  const [isBuilding, setIsBuilding] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (connect: () => Promise<FileSystemDirectoryHandle>) => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError("Impossible d'accéder au dossier sélectionné.");
    }
  };

  const handleBuild = async () => {
    if (!resourcesDirHandle || !outputDirHandle) return;
    setIsBuilding(true);
    setError(null);
    setResult(null);
    try {
      const buildResult = await runBuild(getCurrentFlow(), resourcesDirHandle, outputDirHandle);
      setResult(buildResult);
    } catch (err) {
      console.error(err);
      setError('Le build a échoué.');
    } finally {
      setIsBuilding(false);
    }
  };

  const blocked = result ? result.validation.errors.length > 0 : false;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleConnect(connectResources)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <FolderOpen size={16} /> {resourcesDirHandle ? 'Changer le dossier de ressources' : 'Connecter le dossier de ressources'}
          </button>
          {resourcesDirHandle && (
            <span className="text-sm text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">
              📁 {resourcesDirHandle.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleConnect(connectOutput)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <FolderOpen size={16} /> {outputDirHandle ? 'Changer le dossier de sortie' : 'Connecter le dossier de sortie'}
          </button>
          {outputDirHandle && (
            <span className="text-sm text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">
              📁 {outputDirHandle.name}
            </span>
          )}
        </div>

        <button
          onClick={handleBuild}
          disabled={!resourcesDirHandle || !outputDirHandle || isBuilding}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isBuilding ? <Loader2 size={16} className="animate-spin" /> : <Hammer size={16} />}
          Lancer le Build
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-sm text-red-800 rounded-r-md">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className={`p-3 rounded-lg border-l-4 text-sm font-bold flex items-center gap-2 ${
            blocked ? 'bg-red-50 border-red-500 text-red-800' : 'bg-emerald-50 border-emerald-500 text-emerald-800'
          }`}>
            {blocked ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            {blocked
              ? "Build bloqué par des erreurs — aucun fichier n'a été écrit."
              : `8 fichiers écrits dans ${outputDirHandle?.name}.`}
          </div>

          <ErrorsWarningsSummary errors={result.validation.errors} warnings={result.validation.warnings} />

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Repository hash</div>
              <div className="text-sm font-mono text-slate-700">{truncateHash(result.repository.repository_hash)}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fichiers scannés</div>
              <div className="text-sm font-mono text-slate-700">{result.repository.entry_count}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Routes backend</div>
              <div className="text-sm font-mono text-slate-700">{result.backendContract.endpoints.length}</div>
            </div>
          </div>

          <ReconciliationLists missing={result.reconciliation.missing} orphaned={result.reconciliation.orphaned} />
        </>
      )}
    </div>
  );
};

export default BuildTab;
