import { useState } from 'react';
import { X, Plus, Trash2, Music } from 'lucide-react';

interface AudioMappingManagerProps {
  mappings: Record<string, string>;
  onUpdate: (mappings: Record<string, string>) => void;
  onClose: () => void;
}

const AudioMappingManager = ({ mappings, onUpdate, onClose }: AudioMappingManagerProps) => {
  const [newVarName, setNewVarName] = useState('');
  const [newPath, setNewPath] = useState('');

  const addMapping = () => {
    if (!newVarName || mappings[newVarName]) return;
    onUpdate({ ...mappings, [newVarName]: newPath });
    setNewVarName('');
    setNewPath('');
  };

  const removeMapping = (name: string) => {
    const newMappings = { ...mappings };
    delete newMappings[name];
    onUpdate(newMappings);
  };

  const updatePath = (name: string, path: string) => {
    onUpdate({ ...mappings, [name]: path });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg text-white shadow-sm">
              <Music size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Mappage des Audios Dynamiques</h2>
              <p className="text-sm text-slate-500">Associez des types de variables à des dossiers audios.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="text-sm font-bold text-purple-800 mb-3">Ajouter un nouveau mappage</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Variable (ex: produit)" 
                className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-purple-500"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Chemin (ex: produits/)" 
                className="flex-[2] p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-purple-500"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
              />
              <button 
                onClick={addMapping}
                className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Plus size={16} /> Ajouter
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mappages Actuels</h3>
            {Object.entries(mappings).length === 0 ? (
              <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Aucun mappage défini.
              </div>
            ) : (
              Object.entries(mappings).map(([name, path]) => (
                <div key={name} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-purple-200 transition-colors group">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-tighter">Variable</div>
                    <div className="font-mono text-sm text-purple-700 font-bold">{"{"}{name}{"}"}</div>
                  </div>
                  <div className="flex-[2]">
                    <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-tighter">Dossier Audio</div>
                    <input 
                      type="text" 
                      className="w-full p-1 border border-slate-100 rounded text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                      value={path}
                      onChange={(e) => updatePath(name, e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => removeMapping(name)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-500">
            <p className="font-bold mb-1">💡 Comment ça marche ?</p>
            <p>Si vous avez un mappage <code className="bg-slate-200 px-1 rounded text-slate-700">produit: "produits/"</code>,</p>
            <p className="mt-1">L'élément <code className="bg-slate-200 px-1 rounded text-slate-700">{"{produit}"}</code> dans une séquence audio sera résolu en <code className="bg-slate-200 px-1 rounded text-slate-700">produits/[valeur].mp3</code>.</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition-all shadow-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioMappingManager;
