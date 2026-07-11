import { useState } from 'react';
import { X, CloudDownload, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ActiveOverrides, FlowVariables, FlowHashmaps } from '../types/flow';
import {
  fetchRemoteData,
  computeImportDiff,
  applyImport,
  type RemoteData,
  type ImportDiff,
  type ImportResolution
} from '../utils/remoteImport';

interface ApiImportPanelProps {
  variables: FlowVariables;
  hashmaps: FlowHashmaps;
  activeOverrides: ActiveOverrides;
  onImport: (variables: FlowVariables, hashmaps: FlowHashmaps, activeOverrides: ActiveOverrides) => void;
  onClose: () => void;
}

type Step = 'form' | 'review';

const RESOLUTION_OPTIONS: { value: ImportResolution; label: string }[] = [
  { value: 'local', label: 'Conserver local' },
  { value: 'remote', label: 'Conserver distant' },
  { value: 'merge-local', label: 'Fusionner (priorité locale)' },
  { value: 'merge-remote', label: 'Fusionner (priorité distante)' }
];

const DEFAULT_RESOLUTION: ImportResolution = 'merge-remote';

// inactive : sous-ensemble de `values` à afficher barré/grisé (état inactif
// déclaré par le côté local ou distant concerné) — purement visuel.
const ValueChips = ({ values, inactive = [] }: { values: string[]; inactive?: string[] }) => {
  const inactiveSet = new Set(inactive);
  return (
    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
      {values.length === 0 && <span className="text-[11px] text-slate-400 italic">(vide)</span>}
      {values.map((v, i) => (
        <span
          key={i}
          className={`px-2 py-0.5 rounded-md text-xs font-mono ${inactiveSet.has(v) ? 'bg-slate-100 text-slate-400 line-through' : 'bg-slate-100 text-slate-600'}`}
        >
          {v}
        </span>
      ))}
    </div>
  );
};

const ApiImportPanel = ({ variables, hashmaps, activeOverrides, onImport, onClose }: ApiImportPanelProps) => {
  const [step, setStep] = useState<Step>('form');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [remoteData, setRemoteData] = useState<RemoteData | null>(null);
  const [diff, setDiff] = useState<ImportDiff | null>(null);
  const [variableResolutions, setVariableResolutions] = useState<Record<string, ImportResolution>>({});
  const [hashmapResolutions, setHashmapResolutions] = useState<Record<string, ImportResolution>>({});

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Veuillez renseigner l'URL de la route API.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRemoteData(url.trim(), token.trim() || undefined);
      const computedDiff = computeImportDiff(variables, hashmaps, activeOverrides, data);
      const initialVarResolutions: Record<string, ImportResolution> = {};
      computedDiff.variableConflicts.forEach((c) => { initialVarResolutions[c.name] = DEFAULT_RESOLUTION; });
      const initialHashResolutions: Record<string, ImportResolution> = {};
      computedDiff.hashmapConflicts.forEach((c) => { initialHashResolutions[c.name] = DEFAULT_RESOLUTION; });

      setRemoteData(data);
      setDiff(computedDiff);
      setVariableResolutions(initialVarResolutions);
      setHashmapResolutions(initialHashResolutions);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue lors de la récupération des données.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyToAll = (resolution: ImportResolution) => {
    if (!diff) return;
    const nextVar: Record<string, ImportResolution> = {};
    diff.variableConflicts.forEach((c) => { nextVar[c.name] = resolution; });
    const nextHash: Record<string, ImportResolution> = {};
    diff.hashmapConflicts.forEach((c) => { nextHash[c.name] = resolution; });
    setVariableResolutions(nextVar);
    setHashmapResolutions(nextHash);
  };

  const handleApply = () => {
    if (!remoteData) return;
    const result = applyImport(variables, hashmaps, activeOverrides, remoteData, variableResolutions, hashmapResolutions);
    onImport(result.variables, result.hashmaps, result.activeOverrides);
    onClose();
  };

  const hasConflicts = !!diff && (diff.variableConflicts.length > 0 || diff.hashmapConflicts.length > 0);
  const hasAdditions = !!diff && (diff.variableAdditions.length > 0 || diff.hashmapAdditions.length > 0);
  const hasNothingToImport = !!diff && !hasConflicts && !hasAdditions;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-600 rounded-lg text-white shadow-sm">
              <CloudDownload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Importer depuis une API</h2>
              <p className="text-sm text-slate-500">Récupérez Variables et HashMaps depuis votre backend.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'form' && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">URL de la route API</label>
                <input
                  type="text"
                  placeholder="https://api.exemple.com/flow/variables"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Bearer Token (optionnel)</label>
                <input
                  type="text"
                  placeholder="Laisser vide si non requis"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-cyan-500"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Envoyé comme en-tête <code className="bg-slate-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>.
                </p>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p>La route doit répondre avec un JSON où chaque valeur porte son état actif :</p>
                <p><code className="bg-slate-100 px-1 rounded">variables: {'{ nom: { valeur: true|false } }'}</code></p>
                <p><code className="bg-slate-100 px-1 rounded">hashmaps: {'{ nom: { cle: { active, values: { valeur: true|false } } } }'}</code></p>
                <p>Voir <code className="bg-slate-100 px-1 rounded">API_IMPORT_FORMAT.md</code> pour le détail et des exemples.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleFetch}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-lg font-semibold text-sm hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <CloudDownload size={18} />}
                {isLoading ? 'Récupération...' : 'Récupérer'}
              </button>
            </div>
          )}

          {step === 'review' && diff && (
            <div className="space-y-6">
              {hasNothingToImport && (
                <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
                  <CheckCircle2 size={18} /> Rien de nouveau : les données distantes sont identiques aux données locales.
                </div>
              )}

              {hasAdditions && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                  <p className="font-bold mb-1">Nouveautés ajoutées automatiquement</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {diff.variableAdditions.map((n) => <li key={`va-${n}`}>Variable <span className="font-mono">{n}</span></li>)}
                    {diff.hashmapAdditions.map((n) => <li key={`ha-${n}`}>HashMap <span className="font-mono">{n}</span></li>)}
                  </ul>
                </div>
              )}

              {hasConflicts && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Appliquer à tous les conflits :</span>
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => applyToAll(opt.value)}
                        className="px-2.5 py-1 border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {diff.variableConflicts.map((conflict) => (
                    <div key={`vc-${conflict.name}`} className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" />
                        <h4 className="font-bold text-slate-800 text-sm">Variable <span className="font-mono">{conflict.name}</span></h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Local</p>
                          <ValueChips values={conflict.localValues} inactive={conflict.localInactive} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Distant</p>
                          <ValueChips values={conflict.remoteValues} inactive={conflict.remoteInactive} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-1">
                        {RESOLUTION_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="radio"
                              name={`var-${conflict.name}`}
                              checked={variableResolutions[conflict.name] === opt.value}
                              onChange={() => setVariableResolutions((prev) => ({ ...prev, [conflict.name]: opt.value }))}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {diff.hashmapConflicts.map((conflict) => (
                    <div key={`hc-${conflict.name}`} className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" />
                        <h4 className="font-bold text-slate-800 text-sm">HashMap <span className="font-mono">{conflict.name}</span></h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Local</p>
                          {Object.entries(conflict.localMap).map(([key, values]) => (
                            <div key={key}>
                              <p className={`text-xs font-semibold mb-0.5 ${conflict.localInactiveKeys.includes(key) ? 'text-slate-400 line-through' : 'text-slate-500'}`}>{key}</p>
                              <ValueChips values={values} inactive={conflict.localInactiveValues[key] || []} />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Distant</p>
                          {Object.entries(conflict.remoteMap).map(([key, values]) => (
                            <div key={key}>
                              <p className={`text-xs font-semibold mb-0.5 ${conflict.remoteInactiveKeys.includes(key) ? 'text-slate-400 line-through' : 'text-slate-500'}`}>{key}</p>
                              <ValueChips values={values} inactive={conflict.remoteInactiveValues[key] || []} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-1">
                        {RESOLUTION_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="radio"
                              name={`hash-${conflict.name}`}
                              checked={hashmapResolutions[conflict.name] === opt.value}
                              onChange={() => setHashmapResolutions((prev) => ({ ...prev, [conflict.name]: opt.value }))}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          {step === 'review' && (
            <button
              onClick={() => setStep('form')}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Retour
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>
          {step === 'review' && !hasNothingToImport && (
            <button
              onClick={handleApply}
              className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              Importer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiImportPanel;
