import { useState } from 'react';
import { X, Settings, Plus, Trash2 } from 'lucide-react';
import type { Node } from 'reactflow';
import type { FlowConfig, FlowGraphNodeData, AudioConfig } from '../types/flow';

interface FlowSettingsManagerProps {
  entry: string;
  onEntryChange: (entry: string) => void;
  config: FlowConfig | null;
  onConfigChange: (config: FlowConfig) => void;
  languages: string[];
  onLanguagesChange: (languages: string[]) => void;
  nodes: Node<FlowGraphNodeData>[];
  onClose: () => void;
}

const defaultConfig: FlowConfig = {
  audio: { auto_play_prompt: true, auto_play_option: true, pause_between_ms: 600 }
};

const FlowSettingsManager = ({ entry, onEntryChange, config, onConfigChange, languages, onLanguagesChange, nodes, onClose }: FlowSettingsManagerProps) => {
  const audioConfig = config?.audio || defaultConfig.audio;
  const [newLanguage, setNewLanguage] = useState('');

  const handleAddLanguage = () => {
    const normalized = newLanguage.trim().toLowerCase();
    if (!normalized || languages.includes(normalized)) return;
    onLanguagesChange([...languages, normalized]);
    setNewLanguage('');
  };

  const handleRemoveLanguage = (lang: string) => {
    onLanguagesChange(languages.filter((l) => l !== lang));
  };

  const updateAudioConfig = <K extends keyof AudioConfig>(field: K, value: AudioConfig[K]) => {
    onConfigChange({ ...config, audio: { ...audioConfig, [field]: value } });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-white shadow-sm">
              <Settings size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Paramètres du Flow</h2>
              <p className="text-sm text-slate-500">Point d'entrée et réglages audio globaux.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nœud d'entrée (entry)</label>
            <select
              className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={entry || ''}
              onChange={(e) => onEntryChange(e.target.value)}
            >
              <option value="">(Premier nœud par défaut)</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
            </select>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500">Audio global</label>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Lire automatiquement la question (prompt)</span>
              <input
                type="checkbox"
                checked={!!audioConfig.auto_play_prompt}
                onChange={(e) => updateAudioConfig('auto_play_prompt', e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Lire automatiquement les options</span>
              <input
                type="checkbox"
                checked={!!audioConfig.auto_play_option}
                onChange={(e) => updateAudioConfig('auto_play_option', e.target.checked)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Pause entre audios (ms)</label>
              <input
                type="number"
                min="0"
                step="100"
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={audioConfig.pause_between_ms ?? 600}
                onChange={(e) => updateAudioConfig('pause_between_ms', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500">
              Langues (audio uniquement — les images ne sont jamais dupliquées par langue)
            </label>

            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-mono"
                >
                  {lang}
                  <button
                    onClick={() => handleRemoveLanguage(lang)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title={`Retirer ${lang}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
              {languages.length === 0 && (
                <span className="text-xs text-slate-400 italic">Aucune langue déclarée</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 p-2 border border-slate-200 rounded text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ex. mina"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLanguage()}
              />
              <button
                onClick={handleAddLanguage}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlowSettingsManager;
