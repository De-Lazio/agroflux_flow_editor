import { useState } from 'react';
import { UploadCloud, FolderOpen, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { RESOURCES_DIRECTORY_KEY, PUBLISH_DIRECTORY_KEY } from '../utils/fsAccess';
import { useDirectoryHandle } from '../hooks/useDirectoryHandle';
import { preparePublication } from '../utils/buildProject';
import type { PublicationResult } from '../utils/buildProject';
import ErrorsWarningsSummary from './ErrorsWarningsSummary';
import ReconciliationLists from './ReconciliationLists';
import { truncateHash } from '../utils/format';
import type { FlowData } from '../types/flow';

interface PublicationTabProps {
  getCurrentFlow: () => FlowData;
}

const PublicationTab = ({ getCurrentFlow }: PublicationTabProps) => {
  // Même clé de dossier de ressources que les onglets Ressources/Build : une seule
  // connexion à faire, partagée par tout le Studio.
  const { handle: resourcesDirHandle, connect: connectResources } = useDirectoryHandle(RESOURCES_DIRECTORY_KEY, 'read');
  const { handle: publishDirHandle, connect: connectPublish } = useDirectoryHandle(PUBLISH_DIRECTORY_KEY, 'readwrite');

  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<PublicationResult | null>(null);
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

  const handlePublish = async () => {
    if (!resourcesDirHandle || !publishDirHandle) return;
    setIsPublishing(true);
    setError(null);
    setResult(null);
    try {
      const publicationResult = await preparePublication(getCurrentFlow(), resourcesDirHandle, publishDirHandle);
      setResult(publicationResult);
    } catch (err) {
      console.error(err);
      setError('La publication a échoué.');
    } finally {
      setIsPublishing(false);
    }
  };

  const blocked = result ? result.build.validation.errors.length > 0 : false;

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
        Produit un répertoire "propre" prêt à être consommé par le backend/Flutter :
        <code className="mx-1 bg-slate-200 px-1 rounded">flow.json</code>,
        <code className="mx-1 bg-slate-200 px-1 rounded">manifest.json</code>,
        <code className="mx-1 bg-slate-200 px-1 rounded">repository.json</code> et un dossier
        <code className="mx-1 bg-slate-200 px-1 rounded">assets/</code> ne contenant que les
        ressources réellement référencées par le flow — jamais les fichiers orphelins.
      </p>

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
            onClick={() => handleConnect(connectPublish)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <FolderOpen size={16} /> {publishDirHandle ? 'Changer le dossier de publication' : 'Connecter le dossier de publication'}
          </button>
          {publishDirHandle && (
            <span className="text-sm text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">
              📁 {publishDirHandle.name}
            </span>
          )}
        </div>

        <button
          onClick={handlePublish}
          disabled={!resourcesDirHandle || !publishDirHandle || isPublishing}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          Publier
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
              ? "Publication bloquée par des erreurs — rien n'a été écrit ni copié."
              : `${result.copiedFiles.length} ressource(s) copiée(s) dans ${publishDirHandle?.name}/assets/.`}
          </div>

          <ErrorsWarningsSummary errors={result.build.validation.errors} warnings={result.build.validation.warnings} />

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Repository hash</div>
              <div className="text-sm font-mono text-slate-700">{truncateHash(result.build.repository.repository_hash)}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fichiers copiés</div>
              <div className="text-sm font-mono text-slate-700">{result.copiedFiles.length}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Routes backend</div>
              <div className="text-sm font-mono text-slate-700">{result.build.backendContract.endpoints.length}</div>
            </div>
          </div>

          <ReconciliationLists missing={result.build.reconciliation.missing} orphaned={result.build.reconciliation.orphaned} />
        </>
      )}
    </div>
  );
};

export default PublicationTab;
