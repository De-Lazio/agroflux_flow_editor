import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Eye, Loader2, AlertTriangle, CheckCircle2, Play, Square } from 'lucide-react';
import { useSequentialAudioPlayer } from '../../hooks/useSequentialAudioPlayer';
import {
  computeMissingParams,
  buildRequest,
  buildMockResponse,
  parseAudioSequence
} from '../../utils/simulationEngine';
import type { SimulationContext, AudioSequenceEnvelope } from '../../utils/simulationEngine';
import { readResourceObjectUrl, toLanguageAudioPath } from '../../utils/simulationResources';
import type { ResourceIndex } from '../../utils/simulationResources';
import type { FlowData, ResultNodeData } from '../../types/flow';

interface SimulatorResultPanelProps {
  flow: FlowData;
  node: ResultNodeData;
  contextValues: Record<string, string>;
  baseUrl: string;
  token: string;
  resourceIndex: ResourceIndex | null;
  language: string;
}

type ResponseSource = 'real' | 'mock';

interface ResponseState {
  source: ResponseSource;
  status: number | null;
  json: string;
  unresolved: string[];
  realError?: string;
}

const DEFAULT_PAUSE_MS = 500;

const SimulatorResultPanel = ({ flow, node, contextValues, baseUrl, token, resourceIndex, language }: SimulatorResultPanelProps) => {
  const context: SimulationContext = { values: contextValues, history: [] };
  const missing = computeMissingParams(node, context);
  const request = buildRequest(baseUrl, token, node, context);
  const hasBody = request.method !== 'GET';

  const examples = (node.response_examples || []).filter((ex) => ex.trim() && ex.trim() !== '{}');
  const [exampleIndex, setExampleIndex] = useState(0);

  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<ResponseState | null>(null);

  const applyMockFallback = (status: number | null, realError?: string) => {
    const mock = buildMockResponse(node, context, exampleIndex);
    setResponse({ source: 'mock', status, json: mock.json, unresolved: mock.unresolved, realError });
  };

  const handlePreviewMock = () => applyMockFallback(null);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: hasBody ? JSON.stringify(request.body) : undefined
      });
      const text = await res.text();
      if (res.ok) {
        setResponse({ source: 'real', status: res.status, json: text, unresolved: [] });
      } else {
        applyMockFallback(res.status, `HTTP ${res.status}`);
      }
    } catch (err) {
      applyMockFallback(null, err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setIsSending(false);
    }
  };

  const envelope: AudioSequenceEnvelope | null = response ? parseAudioSequence(response.json) : null;

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Requête (aperçu)</h4>

      {missing.length > 0 && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          Paramètre(s) jamais collecté(s) : {missing.join(', ')}
        </div>
      )}
      {!hasBody && Object.keys(request.body).length > 0 && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          Méthode {request.method} : les paramètres ne peuvent pas être transmis en body par le navigateur (voir DataSource dans types/flow.ts).
        </div>
      )}

      <div className="text-xs font-mono bg-white border border-slate-100 rounded p-2 space-y-1 break-all">
        <div><span className="text-slate-400">{request.method}</span> {request.url}</div>
        {hasBody && <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(request.body, null, 2)}</pre>}
      </div>

      {examples.length > 1 && (
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Exemple à utiliser en repli</label>
          <select
            className="w-full p-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            value={exampleIndex}
            onChange={(e) => setExampleIndex(Number(e.target.value))}
          >
            {examples.map((ex, i) => (
              <option key={i} value={i}>#{i + 1} — {ex.slice(0, 60).replace(/\s+/g, ' ')}…</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Envoyer la requête
        </button>
        <button
          onClick={handlePreviewMock}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          title="Prévisualiser la réponse simulée sans appeler le backend"
        >
          <Eye size={13} /> Aperçu simulé
        </button>
      </div>
      {!baseUrl && <p className="text-[10px] text-slate-400 italic">Aucune URL de base renseignée — la requête réelle échouera probablement.</p>}

      {response && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {response.source === 'real' ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <CheckCircle2 size={14} /> Réponse réelle ({response.status})
            </div>
          ) : (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={13} /> ⚠️ Réponse simulée (route backend indisponible)
              </div>
              {response.realError && <div className="mt-1 text-amber-700">{response.realError}</div>}
            </div>
          )}

          {response.unresolved.length > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              Placeholder(s) sans valeur connue : {response.unresolved.map((p) => `{${p}}`).join(', ')}
            </div>
          )}

          {envelope ? (
            <AudioSequencePlayer flow={flow} envelope={envelope} resourceIndex={resourceIndex} language={language} />
          ) : (
            <pre className="text-[11px] font-mono bg-white border border-slate-100 rounded p-2 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
              {response.json}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

interface AudioSequencePlayerProps {
  flow: FlowData;
  envelope: AudioSequenceEnvelope;
  resourceIndex: ResourceIndex | null;
  language: string;
}

const AudioSequencePlayer = ({ flow, envelope, resourceIndex, language }: AudioSequencePlayerProps) => {
  const { play, stop } = useSequentialAudioPlayer();
  const [blockIndex, setBlockIndex] = useState<number | null>(null);
  const [blockImage, setBlockImage] = useState<string | null>(null);
  const blockImageUrlRef = useRef<string | null>(null);
  const runTokenRef = useRef(0);

  const setBlockImageUrl = useCallback((url: string | null) => {
    if (blockImageUrlRef.current) URL.revokeObjectURL(blockImageUrlRef.current);
    blockImageUrlRef.current = url;
    setBlockImage(url);
  }, []);

  useEffect(() => () => { if (blockImageUrlRef.current) URL.revokeObjectURL(blockImageUrlRef.current); }, []);

  const pauseMs = envelope.pauseMs ?? flow.config?.audio.pause_between_ms ?? DEFAULT_PAUSE_MS;

  const handlePlaySequence = async () => {
    if (!resourceIndex) return;
    runTokenRef.current += 1;
    const token = runTokenRef.current;

    for (let i = 0; i < envelope.sequence.length; i++) {
      if (runTokenRef.current !== token) return;
      const block = envelope.sequence[i];
      setBlockIndex(i);
      if (block.image) {
        const url = await readResourceObjectUrl(resourceIndex, block.image);
        if (runTokenRef.current !== token) return;
        setBlockImageUrl(url);
      } else {
        setBlockImageUrl(null);
      }
      // block.audios vient de la réponse backend (littéral, sans langue —
      // voir API_BACKEND_ROUTES.md §3.2) ; block.image, lui, est déjà un
      // chemin complet ("images/...") et ne se préfixe jamais.
      await play(`seq:${i}`, resourceIndex, block.audios.map((p) => toLanguageAudioPath(language, p)));
      if (runTokenRef.current !== token) return;
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
    if (runTokenRef.current === token) setBlockIndex(null);
  };

  const handleStop = () => {
    runTokenRef.current += 1;
    stop();
    setBlockIndex(null);
  };

  const isPlayingSequence = blockIndex !== null;

  return (
    <div className="space-y-2">
      <button
        disabled={!resourceIndex || envelope.sequence.length === 0}
        onClick={isPlayingSequence ? handleStop : handlePlaySequence}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded text-xs font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPlayingSequence ? <Square size={13} /> : <Play size={13} />}
        {isPlayingSequence ? `Bloc ${blockIndex! + 1}/${envelope.sequence.length}` : `Lire la séquence (${envelope.sequence.length} blocs)`}
      </button>
      {!resourceIndex && <p className="text-[10px] text-slate-400 italic">Connectez le dossier de ressources pour écouter la séquence.</p>}
      {blockImage && (
        <img src={blockImage} alt="Bloc en cours" className="max-h-32 rounded-lg border border-slate-200 shadow-sm mx-auto" />
      )}
    </div>
  );
};

export default SimulatorResultPanel;
