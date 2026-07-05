import { useState } from 'react';
import { X, Plus, Trash2, Library, ChevronRight } from 'lucide-react';

interface HashMapManagerProps {
  hashmaps: Record<string, Record<string, string[]>>;
  onUpdate: (hashmaps: Record<string, Record<string, string[]>>) => void;
  onClose: () => void;
  variables: Record<string, string[]>;
}

const HashMapManager = ({ hashmaps, onUpdate, onClose }: HashMapManagerProps) => {
  const [newHashMapName, setNewHashMapName] = useState('');
  const [selectedHashMap, setSelectedHashMap] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');

  const addHashMap = () => {
    if (!newHashMapName || hashmaps[newHashMapName]) return;
    onUpdate({ ...hashmaps, [newHashMapName]: {} });
    setNewHashMapName('');
    setSelectedHashMap(newHashMapName);
  };

  const removeHashMap = (name: string) => {
    const newHashMaps = { ...hashmaps };
    delete newHashMaps[name];
    onUpdate(newHashMaps);
    if (selectedHashMap === name) setSelectedHashMap(null);
  };

  const addKey = (mapName: string) => {
    if (!newKey || hashmaps[mapName][newKey]) return;
    const newHashMaps = { ...hashmaps };
    newHashMaps[mapName] = { ...newHashMaps[mapName], [newKey]: [] };
    onUpdate(newHashMaps);
    setNewKey('');
  };

  const removeKey = (mapName: string, key: string) => {
    const newHashMaps = { ...hashmaps };
    const newMap = { ...newHashMaps[mapName] };
    delete newMap[key];
    newHashMaps[mapName] = newMap;
    onUpdate(newHashMaps);
  };

  const addValue = (mapName: string, key: string, value: string) => {
    if (!value) return;
    const newHashMaps = { ...hashmaps };
    newHashMaps[mapName][key] = [...newHashMaps[mapName][key], value];
    onUpdate(newHashMaps);
  };

  const removeValue = (mapName: string, key: string, index: number) => {
    const newHashMaps = { ...hashmaps };
    newHashMaps[mapName][key] = newHashMaps[mapName][key].filter((_, i) => i !== index);
    onUpdate(newHashMaps);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-200">
              <Library size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestionnaire de HashMaps</h2>
              <p className="text-sm text-slate-500 font-medium">Créez des structures de données filtrables (ex: Départements {'>'} Marchés).</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all active:scale-90">
            <X size={28} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Liste des HashMaps (Sidebar) */}
          <div className="w-80 border-r border-slate-100 p-6 space-y-6 overflow-y-auto bg-slate-50/30">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em]">Nouveau HashMap</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nom (ex: loc_marche)..." 
                  className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none shadow-sm transition-all"
                  value={newHashMapName}
                  onChange={(e) => setNewHashMapName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addHashMap()}
                />
                <button 
                  onClick={addHashMap}
                  className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em]">Vos HashMaps</h3>
              {Object.keys(hashmaps).length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium">Aucun hashmap créé.</p>
                </div>
              )}
              {Object.keys(hashmaps).map(name => (
                <div 
                  key={name} 
                  onClick={() => setSelectedHashMap(name)}
                  className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                    selectedHashMap === name 
                    ? 'bg-amber-50 border-amber-200 shadow-sm' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${selectedHashMap === name ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className={`text-sm font-bold ${selectedHashMap === name ? 'text-amber-900' : 'text-slate-700'}`}>{name}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeHashMap(name); }}
                    className="p-1.5 text-slate-300 group-hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Contenu du HashMap sélectionné */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedHashMap ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Library size={18} />
                    <ChevronRight size={16} />
                    <h4 className="text-lg font-black text-slate-800">{selectedHashMap}</h4>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ajouter une clé (ex: Ouémé)..." 
                      className="w-64 p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addKey(selectedHashMap)}
                    />
                    <button 
                      onClick={() => addKey(selectedHashMap)}
                      className="px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-md active:scale-95"
                    >
                      Ajouter Clé
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {Object.entries(hashmaps[selectedHashMap]).map(([key, values]) => (
                      <div key={key} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-fit">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="font-black text-slate-800 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-amber-400 rounded-full"></span>
                            {key}
                          </h5>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">
                              {values.length} items
                            </span>
                            <button onClick={() => removeKey(selectedHashMap, key)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4 min-h-[60px] p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          {values.length === 0 && <p className="text-[10px] text-slate-400 italic m-auto">Aucune valeur</p>}
                          {values.map((val, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 shadow-sm group hover:border-amber-200">
                              <span>{val}</span>
                              <button onClick={() => removeValue(selectedHashMap, key, idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Ajouter une valeur + Entrée" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addValue(selectedHashMap, key, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Library size={48} />
                </div>
                <h4 className="text-xl font-bold text-slate-400">Sélectionnez un HashMap</h4>
                <p className="text-sm font-medium mt-2">ou créez-en un nouveau dans la barre latérale.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 text-sm uppercase tracking-wider"
          >
            Fermer le gestionnaire
          </button>
        </div>
      </div>
    </div>
  );
};

export default HashMapManager;
