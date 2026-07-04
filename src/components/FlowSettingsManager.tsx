import { X, Settings } from 'lucide-react';

interface FlowSettingsManagerProps {
  entry: string;
  onEntryChange: (entry: string) => void;
  config: any;
  onConfigChange: (config: any) => void;
  nodes: any[];
  onClose: () => void;
}

const defaultConfig = {
  audio: { auto_play_prompt: true, auto_play_option: true, pause_between_ms: 600 }
};

const FlowSettingsManager = ({ entry, onEntryChange, config, onConfigChange, nodes, onClose }: FlowSettingsManagerProps) => {
  const audioConfig = config?.audio || defaultConfig.audio;

  const updateAudioConfig = (field: string, value: any) => {
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
              {nodes.map((n: any) => <option key={n.id} value={n.id}>{n.id}</option>)}
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
