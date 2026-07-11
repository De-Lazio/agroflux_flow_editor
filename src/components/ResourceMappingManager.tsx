import { RefreshCw, X, FolderTree, Music, Image as ImageIcon, Lock } from 'lucide-react';
import { AUDIO_FORMATS, IMAGE_FORMATS, syncResourceMappings } from '../utils/resourceInventory';

interface ResourceMappingManagerProps {
  variables: Record<string, string[]>;
  hashmaps: Record<string, Record<string, string[]>>;
  mappings: Record<string, string>;
  onUpdateMappings: (mappings: Record<string, string>) => void;
  audioFormat: string;
  imageFormat: string;
  onAudioFormatChange: (format: string) => void;
  onImageFormatChange: (format: string) => void;
  hashmapsNoResources: string[];
  onHashmapsNoResourcesChange: (names: string[]) => void;
  onClose: () => void;
}

const ResourceMappingManager = ({
  variables,
  hashmaps,
  mappings,
  onUpdateMappings,
  audioFormat,
  imageFormat,
  onAudioFormatChange,
  onImageFormatChange,
  hashmapsNoResources,
  onHashmapsNoResourcesChange,
  onClose
}: ResourceMappingManagerProps) => {

  const handleRegenerate = () => {
    onUpdateMappings(syncResourceMappings(mappings, variables, hashmaps));
  };

  const toggleHashmapResources = (name: string) => {
    const needsResources = hashmapsNoResources.includes(name);
    onHashmapsNoResourcesChange(
      needsResources
        ? hashmapsNoResources.filter((n) => n !== name)
        : [...hashmapsNoResources, name]
    );
  };

  const variableRows = Object.entries(variables).map(([name, values]) => ({
    name,
    folder: mappings[name] || name,
    count: values.length
  }));

  const hashmapRows = Object.entries(hashmaps).map(([name, keys]) => ({
    name,
    folder: mappings[name] || name,
    count: Object.values(keys).reduce((sum, vals) => sum + vals.length, 0)
  }));

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg text-white shadow-sm">
              <FolderTree size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Mapping Audio & Image</h2>
              <p className="text-sm text-slate-500">Dossier de ressources associé à chaque variable et hashmap.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div>
              <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1 flex items-center gap-1">
                <Music size={12} /> Format Audio
              </label>
              <select
                className="w-full p-2 border border-purple-200 rounded text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                value={audioFormat}
                onChange={(e) => onAudioFormatChange(e.target.value)}
              >
                {AUDIO_FORMATS.map(f => <option key={f} value={f}>.{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1 flex items-center gap-1">
                <ImageIcon size={12} /> Format Image
              </label>
              <select
                className="w-full p-2 border border-purple-200 rounded text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                value={imageFormat}
                onChange={(e) => onImageFormatChange(e.target.value)}
              >
                {IMAGE_FORMATS.map(f => <option key={f} value={f}>.{f}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Lock size={12} /> Lecture seule — régénérez pour synchroniser
            </div>
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <RefreshCw size={14} /> Régénérer
            </button>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variables ({variableRows.length})</h3>
            <div className="space-y-1.5">
              {variableRows.length === 0 && (
                <p className="text-xs text-slate-400 italic">Aucune variable déclarée.</p>
              )}
              {variableRows.map(row => (
                <div key={row.name} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <span className="font-semibold text-slate-700">{row.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{row.count} valeurs</span>
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200 text-purple-600">/{row.folder}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HashMaps ({hashmapRows.length})</h3>
            <div className="space-y-1.5">
              {hashmapRows.length === 0 && (
                <p className="text-xs text-slate-400 italic">Aucun hashmap déclaré.</p>
              )}
              {hashmapRows.map(row => {
                const needsResources = !hashmapsNoResources.includes(row.name);
                return (
                  <div key={row.name} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm gap-3">
                    <span className="font-semibold text-slate-700">{row.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-slate-400">{row.count} valeurs</span>
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200 text-purple-600">/{row.folder}</span>
                      <button
                        type="button"
                        onClick={() => toggleHashmapResources(row.name)}
                        title={
                          needsResources
                            ? "Génère ses propres ressources audio/image — cliquer pour désactiver si clé et valeurs viennent déjà d'une variable existante"
                            : 'Ne génère aucune ressource propre (audio/image déjà couvertes par une variable existante) — cliquer pour réactiver'
                        }
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${needsResources ? 'bg-purple-500' : 'bg-slate-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${needsResources ? 'translate-x-4' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-1">
            <p className="font-bold">💡 Comment ça marche ?</p>
            <p>
              Pour la variable <code className="bg-slate-200 px-1 rounded text-slate-700">produits</code> mappée
              au dossier <code className="bg-slate-200 px-1 rounded text-slate-700">produits</code>, chaque valeur
              (ex. <code className="bg-slate-200 px-1 rounded text-slate-700">riz</code>) génère une ressource audio{' '}
              <strong>par langue active</strong> (ex.{' '}
              <code className="bg-slate-200 px-1 rounded text-slate-700">audio/fon/produits/riz.{audioFormat}</code>) et
              une seule image, jamais dupliquée par langue :{' '}
              <code className="bg-slate-200 px-1 rounded text-slate-700">images/produits/riz.{imageFormat}</code>.
            </p>
            <p>
              Pour un hashmap, chaque valeur génère{' '}
              <code className="bg-slate-200 px-1 rounded text-slate-700">audio/{'{langue}'}/nom/cle/valeur.{audioFormat}</code>{' '}
              (une par langue) et l'équivalent en image, sans segment langue.
            </p>
            <p>
              Le switch à côté de chaque hashmap permet de désactiver cette génération quand la
              clé et les valeurs correspondent déjà à des variables existantes ailleurs dans le
              flow : le mobile réutilise alors leurs ressources, sans doublon.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceMappingManager;
