import { useEffect, useState } from 'react';
import {
  X,
  Rocket,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Globe,
  FolderOpen,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useDirectoryHandle } from '../hooks/useDirectoryHandle';
import { RESOURCES_DIRECTORY_KEY, verifyPermission } from '../utils/fsAccess';
import { createInitialContext, jumpToStep, advance } from '../utils/simulationEngine';
import type { SimulationContext } from '../utils/simulationEngine';
import { buildResourceIndex } from '../utils/simulationResources';
import type { ResourceIndex } from '../utils/simulationResources';
import { loadSimulatorConfig, saveSimulatorConfig } from '../utils/simulatorConfig';
import type { SimulatorConfig } from '../utils/simulatorConfig';
import SimulatorStepBody from './simulator/SimulatorStepBody';
import SimulatorResultPanel from './simulator/SimulatorResultPanel';
import type { FlowData } from '../types/flow';

interface SimulatorPanelProps {
  getCurrentFlow: () => FlowData;
  onClose: () => void;
}

const SimulatorPanel = ({ getCurrentFlow, onClose }: SimulatorPanelProps) => {
  // Photographie du flow au moment de l'ouverture : une simulation en cours ne
  // doit pas changer de forme sous les pieds du testeur si le flow est édité
  // en parallèle dans le Studio.
  const [flow] = useState<FlowData>(() => getCurrentFlow());

  const [config, setConfig] = useState<SimulatorConfig>(() => loadSimulatorConfig());
  const [configOpen, setConfigOpen] = useState(() => !loadSimulatorConfig().baseUrl);
  useEffect(() => { saveSimulatorConfig(config); }, [config]);

  const { handle: dirHandle, connect } = useDirectoryHandle(RESOURCES_DIRECTORY_KEY, 'read');
  const [resourceIndex, setResourceIndex] = useState<ResourceIndex | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);

  useEffect(() => {
    if (!dirHandle) return;
    let cancelled = false;
    (async () => {
      setIsIndexing(true);
      setResourceError(null);
      try {
        if (!(await verifyPermission(dirHandle, 'read'))) {
          if (!cancelled) setResourceError('Permission refusée pour ce dossier — reconnectez-le.');
          return;
        }
        const index = await buildResourceIndex(dirHandle);
        if (!cancelled) setResourceIndex(index);
      } catch (err) {
        console.error(err);
        if (!cancelled) setResourceError('Le scan du dossier de ressources a échoué.');
      } finally {
        if (!cancelled) setIsIndexing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dirHandle]);

  const handleConnectResources = async () => {
    setResourceError(null);
    try {
      await connect();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setResourceError("Impossible d'accéder au dossier sélectionné.");
    }
  };

  const [context, setContext] = useState<SimulationContext>(createInitialContext());
  const [currentNodeId, setCurrentNodeId] = useState<string>(flow.entry);

  const language = config.language || flow.languages?.[0] || 'fr';
  const currentNode = flow.nodes?.[currentNodeId];

  // Retourne un message d'erreur (affiché par SimulatorStepBody) au lieu de le
  // stocker ici : cet état est propre à l'étape en cours et repart à zéro tout
  // seul au changement de nœud grâce à key={currentNodeId} ci-dessous.
  const handleSelect = (value: string): string | undefined => {
    const result = advance(flow, currentNodeId, context, value);
    if (result.error) return result.error;
    if (!result.nextNodeId) return `Nœud "${currentNodeId}" : aucun "next" défini, navigation bloquée.`;
    setContext(result.context);
    setCurrentNodeId(result.nextNodeId);
    return undefined;
  };

  const handleRestart = () => {
    setContext(createInitialContext());
    setCurrentNodeId(flow.entry);
  };

  const handleJumpTo = (index: number) => {
    const targetNodeId = context.history[index]?.nodeId;
    if (targetNodeId === undefined) return;
    setContext(jumpToStep(context, index));
    setCurrentNodeId(targetNodeId);
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
            <Rocket size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Simulateur de Flow</h2>
            <p className="text-xs text-slate-500">Rejoue le flow nœud par nœud, comme le ferait l'app mobile.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw size={15} /> Recommencer
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={22} className="text-slate-500" />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50/60 shrink-0">
        <button
          onClick={() => setConfigOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-100 transition-colors"
        >
          <span>Configuration</span>
          {configOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {configOpen && (
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL de base du backend</label>
              <input
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://api.exemple.com"
                value={config.baseUrl}
                onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                <KeyRound size={11} /> Bearer Token
              </label>
              <input
                className="w-full p-2 border border-slate-200 rounded text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="optionnel"
                value={config.token}
                onChange={(e) => setConfig((c) => ({ ...c, token: e.target.value }))}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                <Globe size={11} /> Langue
              </label>
              <select
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={language}
                onChange={(e) => setConfig((c) => ({ ...c, language: e.target.value }))}
              >
                {(flow.languages || []).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                <FolderOpen size={11} /> Dossier de ressources
              </label>
              <button
                onClick={handleConnectResources}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                {isIndexing ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
                {dirHandle ? dirHandle.name : 'Connecter'}
              </button>
            </div>
          </div>
        )}

        {resourceError && <div className="px-4 pb-3 text-xs text-red-600">{resourceError}</div>}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <SimulatorStepBody
            key={currentNodeId}
            flow={flow}
            currentNodeId={currentNodeId}
            contextValues={context.values}
            resourceIndex={resourceIndex}
            language={language}
            onSelect={handleSelect}
          />
        </div>

        <div className="w-[380px] shrink-0 border-l border-slate-200 bg-slate-50/40 overflow-y-auto p-4 space-y-5">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Chemin parcouru</h4>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleRestart}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                  context.history.length === 0
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {flow.entry}
              </button>
              {context.history.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <ArrowRight size={10} className="text-slate-300" />
                  <button
                    onClick={() => handleJumpTo(i)}
                    title={step.paramName ? `${step.paramName} = ${step.value}` : undefined}
                    className="px-2 py-1 rounded text-[11px] font-mono border bg-white text-slate-500 border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    {step.nodeId}
                  </button>
                </div>
              ))}
              {context.history.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <ArrowRight size={10} className="text-slate-300" />
                  <span className="px-2 py-1 rounded text-[11px] font-mono bg-indigo-600 text-white">{currentNodeId}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contexte collecté</h4>
            {Object.keys(context.values).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Rien collecté pour l'instant.</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(context.values).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 text-xs font-mono bg-white border border-slate-100 rounded px-2 py-1">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-slate-700 truncate">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentNode?.type === 'result' && (
            <SimulatorResultPanel
              key={currentNodeId}
              flow={flow}
              node={currentNode}
              contextValues={context.values}
              baseUrl={config.baseUrl}
              token={config.token}
              resourceIndex={resourceIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulatorPanel;
