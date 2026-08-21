import { useState } from 'react';
import { FolderOpen, ScanLine, Wand2, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { verifyPermission, RESOURCES_DIRECTORY_KEY } from '../utils/fsAccess';
import { useDirectoryHandle } from '../hooks/useDirectoryHandle';
import { analyzeResources } from '../utils/buildProject';
import type { ResourceAnalysis } from '../utils/buildProject';
import { resourceTypeForPath } from '../utils/assetRepository';
import { generatePlaceholderResources } from '../utils/resourceGenerator';
import type { GeneratePlaceholdersResult } from '../utils/resourceGenerator';
import ErrorsWarningsSummary from './ErrorsWarningsSummary';
import ReconciliationLists from './ReconciliationLists';
import type { FlowData } from '../types/flow';

interface GeneratorTabProps {
  getCurrentFlow: () => FlowData;
}

const GeneratorTab = ({ getCurrentFlow }: GeneratorTabProps) => {
  const { handle: dirHandle, connect } = useDirectoryHandle(RESOURCES_DIRECTORY_KEY, 'readwrite');

  const [analysis, setAnalysis] = useState<ResourceAnalysis | null>(null);
  const [forceAll, setForceAll] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GeneratePlaceholdersResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
      setAnalysis(null);
      setGenerationResult(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError("Impossible d'accéder au dossier sélectionné.");
    }
  };

  const runAnalysis = async () => {
    if (!dirHandle) return null;
    setIsAnalyzing(true);
    setError(null);
    try {
      if (!(await verifyPermission(dirHandle, 'readwrite'))) {
        setError('Permission refusée pour ce dossier — reconnectez-le.');
        return null;
      }
      const result = await analyzeResources(getCurrentFlow(), dirHandle);
      setAnalysis(result);
      return result;
    } catch (err) {
      console.error(err);
      setError("L'analyse du dossier a échoué.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!dirHandle || !analysis) return;

    if (forceAll && !window.confirm(
      'Régénérer TOUTES les ressources attendues écrasera aussi celles déjà présentes — y compris de vrais fichiers déjà livrés par l\'équipe Studio. Continuer ?'
    )) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);
    try {
      const targetPaths = forceAll
        ? [...analysis.validation.report.audios, ...analysis.validation.report.images]
        : analysis.reconciliation.missing;

      const result = await generatePlaceholderResources(targetPaths, dirHandle);
      setGenerationResult(result);
      await runAnalysis();
    } catch (err) {
      console.error(err);
      setError('La génération des ressources a échoué.');
    } finally {
      setIsGenerating(false);
    }
  };

  const missing = analysis?.reconciliation.missing ?? [];
  const missingImages = missing.filter((path) => resourceTypeForPath(path) === 'image').length;
  const missingAudios = missing.filter((path) => resourceTypeForPath(path) === 'audio').length;
  const generateTargetCount = forceAll
    ? (analysis ? analysis.validation.report.audios.length + analysis.validation.report.images.length : 0)
    : missing.length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Génère des ressources placeholder (images labellisées + bip audio) pour chaque fichier attendu par le
        flow mais absent du disque — le temps que l'équipe Studio livre les vraies ressources. Les images
        générées portent un bandeau "PLACEHOLDER" pour ne jamais être confondues avec un vrai asset.
      </p>

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
          onClick={runAnalysis}
          disabled={!dirHandle || isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
          Analyser
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-sm text-red-800 rounded-r-md">
          {error}
        </div>
      )}

      {analysis && (
        <>
          <ErrorsWarningsSummary errors={analysis.validation.errors} warnings={analysis.validation.warnings} />

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Images manquantes</div>
              <div className="text-sm font-mono text-slate-700">{missingImages}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Audios manquants</div>
              <div className="text-sm font-mono text-slate-700">{missingAudios}</div>
            </div>
          </div>

          <ReconciliationLists missing={analysis.reconciliation.missing} orphaned={analysis.reconciliation.orphaned} />

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={forceAll}
                onChange={(e) => setForceAll(e.target.checked)}
                className="rounded border-slate-300"
              />
              Régénérer aussi les ressources déjà présentes (écrase, y compris de vrais fichiers)
            </label>

            <button
              onClick={handleGenerate}
              disabled={!dirHandle || isGenerating || generateTargetCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {forceAll
                ? `Régénérer les ${generateTargetCount} ressources`
                : `Générer les ${generateTargetCount} ressources manquantes`}
            </button>
          </div>
        </>
      )}

      {generationResult && (
        <div className={`p-3 rounded-lg border-l-4 text-sm font-bold flex items-center gap-2 ${
          generationResult.failed.length > 0 ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-emerald-50 border-emerald-500 text-emerald-800'
        }`}>
          {generationResult.failed.length > 0 ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          {generationResult.generated.length} ressource(s) générée(s)
          {generationResult.failed.length > 0 && `, ${generationResult.failed.length} échec(s)`}.
        </div>
      )}

      {generationResult && generationResult.failed.length > 0 && (
        <div className="space-y-1 max-h-[160px] overflow-y-auto">
          {generationResult.failed.map(({ path, error: failureReason }) => (
            <div key={path} className="text-[11px] font-mono p-1.5 rounded bg-red-50 text-red-700 break-all">
              {path} — {failureReason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GeneratorTab;
