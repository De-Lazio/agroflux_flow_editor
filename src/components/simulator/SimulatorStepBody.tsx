import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { AlertTriangle, CheckCircle2, CalendarDays, Volume2, VolumeX, Image as ImageIcon, ImageOff, Play, Square } from 'lucide-react';
import { useSequentialAudioPlayer } from '../../hooks/useSequentialAudioPlayer';
import { resolveStep } from '../../utils/simulationEngine';
import type { SimulationOption } from '../../utils/simulationEngine';
import {
  resolveAudioPath,
  resolveImagePath,
  resolveRootOptionAudioPath,
  resolveLiteralPath,
  readResourceObjectUrl,
  toLanguageAudioPath
} from '../../utils/simulationResources';
import type { ResourceIndex, ResourceLookup } from '../../utils/simulationResources';
import type { FlowData } from '../../types/flow';

interface SimulatorStepBodyProps {
  flow: FlowData;
  currentNodeId: string;
  contextValues: Record<string, string>;
  resourceIndex: ResourceIndex | null;
  language: string;
  // Retourne un message d'erreur si le choix est invalide, undefined sinon —
  // en cas de succès le parent change currentNodeId, ce qui démonte/remonte
  // ce composant (voir key={currentNodeId} dans SimulatorPanel) : tout l'état
  // propre à l'étape (audio en cours, aperçu image, erreur) repart donc à
  // zéro naturellement, sans effet de "reset" à écrire à la main.
  onSelect: (value: string) => string | undefined;
}

type IconComponent = ComponentType<{ size?: number; className?: string }>;

const ResourceBadge = ({ lookup, Icon, IconOff }: { lookup: ResourceLookup | null; Icon: IconComponent; IconOff: IconComponent }) => {
  if (!lookup) return null;
  if (lookup.method === 'not-found') return <IconOff size={13} className="text-red-400" />;
  return <Icon size={13} className={lookup.method === 'best-effort' ? 'text-amber-500' : 'text-emerald-500'} />;
};

// Champ hors schéma typé (voir types/flow.ts) mais bien présent dans le JSON
// et préservé tel quel par flowToJson/jsonToFlow (spread) — même traitement
// "sonde" que FlowNodeProbe côté validator.ts.
const audioPromptOf = (node: unknown): string | undefined => (node as { audio_prompt?: string })?.audio_prompt;

const SimulatorStepBody = ({ flow, currentNodeId, contextValues, resourceIndex, language, onSelect }: SimulatorStepBodyProps) => {
  const currentNode = flow.nodes?.[currentNodeId];
  const resolution = resolveStep(flow, currentNodeId, { values: contextValues, history: [] });

  const [stepError, setStepError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const { play, stop, playingKey } = useSequentialAudioPlayer();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const previewImageUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewImageUrlRef.current) URL.revokeObjectURL(previewImageUrlRef.current);
  }, []);

  const setPreviewImageUrl = useCallback((url: string | null) => {
    if (previewImageUrlRef.current) URL.revokeObjectURL(previewImageUrlRef.current);
    previewImageUrlRef.current = url;
    setPreviewImage(url);
  }, []);

  const handleSelect = (value: string) => {
    const error = onSelect(value);
    if (error) setStepError(error);
  };

  const resolveOptionAudio = (option: SimulationOption): ResourceLookup | null => {
    if (!resourceIndex || !currentNode) return null;
    if (currentNode.type === 'root') return resolveRootOptionAudioPath(resourceIndex, flow, option.value, language);
    if (currentNode.type === 'grid') {
      return resolveAudioPath(resourceIndex, flow, currentNode.options_source, undefined, option.value, language);
    }
    if (currentNode.type === 'pre_filter') {
      const key = contextValues[currentNode.cle];
      return resolveAudioPath(resourceIndex, flow, currentNode.filtre_source, key, option.value, language);
    }
    return null;
  };

  // Aucune convention d'image n'existe pour les options d'un nœud root (voir
  // simulation_plan.md §3.2) : seul l'audio y est résolu.
  const resolveOptionImage = (option: SimulationOption): ResourceLookup | null => {
    if (!resourceIndex || !currentNode) return null;
    if (currentNode.type === 'grid') {
      return resolveImagePath(resourceIndex, flow, currentNode.options_source, undefined, option.value);
    }
    if (currentNode.type === 'pre_filter') {
      const key = contextValues[currentNode.cle];
      return resolveImagePath(resourceIndex, flow, currentNode.filtre_source, key, option.value);
    }
    return null;
  };

  const handlePreviewOption = async (option: SimulationOption) => {
    if (!resourceIndex) return;
    const audio = resolveOptionAudio(option);
    const image = resolveOptionImage(option);

    if (audio?.path) play(`option:${option.value}`, resourceIndex, [audio.path]);

    if (image?.path) {
      const url = await readResourceObjectUrl(resourceIndex, image.path);
      setPreviewImageUrl(url);
    } else {
      setPreviewImageUrl(null);
    }
  };

  const renderOptionsGrid = (options: SimulationOption[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.length === 0 && <p className="text-sm text-slate-400 italic col-span-full">Aucune option disponible.</p>}
      {options.map((opt) => {
        const audio = resolveOptionAudio(opt);
        const image = resolveOptionImage(opt);
        const canPreview = !!(audio?.path || image?.path);
        const isPlayingThis = playingKey === `option:${opt.value}`;
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
          >
            <span className="truncate">{opt.label}</span>
            <span className="flex items-center gap-1 shrink-0">
              {canPreview ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handlePreviewOption(opt); }}
                  title="Aperçu audio/image"
                  className="p-1 rounded hover:bg-indigo-100 text-indigo-500"
                >
                  {isPlayingThis ? <Square size={12} /> : <Play size={12} />}
                </span>
              ) : (
                <ResourceBadge lookup={audio} Icon={Volume2} IconOff={VolumeX} />
              )}
              <ResourceBadge lookup={image} Icon={ImageIcon} IconOff={ImageOff} />
            </span>
          </button>
        );
      })}
    </div>
  );

  if (resolution.type === 'unknown') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {resolution.message}
      </div>
    );
  }

  if (!currentNode) return null;

  // Chemins littéraux du flow, sans dimension langue (voir
  // API_BACKEND_ROUTES.md §3.2) : toLanguageAudioPath() ajoute le préfixe
  // audio/{langue}/ avant toute résolution/lecture, jamais avant (le champ
  // brut reste utile tel quel pour l'affichage, ex. l'attribut title).
  const introPaths = (currentNode.audio?.sequence || []).map((p) => toLanguageAudioPath(language, p));
  const introFallback = currentNode.audio?.fallback ? toLanguageAudioPath(language, currentNode.audio.fallback) : undefined;
  const introAvailable = !!resourceIndex && introPaths.length > 0;
  const isPlayingIntro = playingKey === 'intro';

  const promptPath = audioPromptOf(currentNode);
  const resolvedPromptPath = promptPath ? toLanguageAudioPath(language, promptPath) : undefined;
  const promptFound = resourceIndex && resolvedPromptPath ? resolveLiteralPath(resourceIndex, resolvedPromptPath).method !== 'not-found' : false;
  const isPlayingPrompt = playingKey === 'prompt';

  return (
    <div className="max-w-2xl">
      {stepError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {stepError}
        </div>
      )}

      <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide mb-1">{currentNode.type}</div>
      <h3 className="text-2xl font-bold text-slate-800 font-mono mb-3">{currentNodeId}</h3>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          disabled={!introAvailable}
          onClick={() => {
            if (!resourceIndex) return;
            if (isPlayingIntro) stop();
            else play('intro', resourceIndex, introPaths, introFallback);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPlayingIntro ? <Square size={12} /> : <Play size={12} />} Intro
        </button>

        {promptPath && (
          <button
            disabled={!promptFound}
            onClick={() => {
              if (!resourceIndex || !resolvedPromptPath) return;
              if (isPlayingPrompt) stop();
              else play('prompt', resourceIndex, [resolvedPromptPath]);
            }}
            title={promptPath}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPlayingPrompt ? <Square size={12} /> : <Play size={12} />} Question
          </button>
        )}
      </div>

      {currentNode.comment && (
        <p className="text-sm text-slate-600 whitespace-pre-line mb-5 bg-slate-50 border border-slate-100 rounded-lg p-3 max-h-40 overflow-y-auto">
          {currentNode.comment}
        </p>
      )}

      {previewImage && (
        <div className="mb-4">
          <img src={previewImage} alt="Aperçu" className="max-h-32 rounded-lg border border-slate-200 shadow-sm" />
        </div>
      )}

      {(resolution.type === 'root' || resolution.type === 'grid') && renderOptionsGrid(resolution.options)}

      {resolution.type === 'pre_filter' && (
        <>
          {resolution.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3 flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {resolution.error}
            </div>
          )}
          {resolution.warning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-3 flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {resolution.warning}
            </div>
          )}
          {resolution.options.length > 0 && renderOptionsGrid(resolution.options)}
        </>
      )}

      {resolution.type === 'calendrier' && (
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-violet-500" />
          <input
            type="date"
            min={resolution.window.min}
            max={resolution.window.max}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            disabled={!selectedDate}
            onClick={() => handleSelect(selectedDate)}
            className="px-4 py-2 bg-violet-600 text-white rounded text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Valider cette date
          </button>
        </div>
      )}

      {currentNode.type === 'result' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} /> Nœud résultat atteint — voir l'aperçu de la requête dans le panneau latéral.
        </div>
      )}
    </div>
  );
};

export default SimulatorStepBody;
