import { useState } from 'react';
import { X, Plus, Trash2, Database } from 'lucide-react';

interface VariableManagerProps {
  variables: Record<string, string[]>;
  onUpdate: (variables: Record<string, string[]>) => void;
  onClose: () => void;
  nodes: any[];
}

const VariableManager = ({ variables, onUpdate, onClose, nodes }: VariableManagerProps) => {
  const [newVarName, setNewVarName] = useState('');

  const addVariable = () => {
    if (!newVarName || variables[newVarName]) return;
    onUpdate({ ...variables, [newVarName]: [] });
    setNewVarName('');
  };

  const removeVariable = (name: string) => {
    // Vérifier si la variable est utilisée
    const isUsed = nodes.some(node => 
      node.data.options_source === name || 
      node.data.set === name
    );

    if (isUsed) {
      alert(`La variable "${name}" est en cours d'utilisation dans un ou plusieurs nœuds et ne peut pas être supprimée.`);
      return;
    }

    const newVars = { ...variables };
    delete newVars[name];
    onUpdate(newVars);
  };

  const addValue = (varName: string, value: string) => {
    if (!value) return;
    const newVars = { ...variables };
    newVars[varName] = [...newVars[varName], value];
    onUpdate(newVars);
  };

  const removeValue = (varName: string, index: number) => {
    const newVars = { ...variables };
    newVars[varName] = newVars[varName].filter((_, i) => i !== index);
    onUpdate(newVars);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg text-white shadow-sm">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Gestionnaire de Variables</h2>
              <p className="text-sm text-slate-500">Déclarez des listes réutilisables pour vos filtres et menus.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Liste des variables */}
          <div className="w-full md:w-1/3 border-r border-slate-100 p-6 space-y-4 overflow-y-auto bg-slate-50/50">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Variables Disponibles</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nom (ex: produits)..." 
                className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
              />
              <button 
                onClick={addVariable}
                className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-2">
              {Object.keys(variables).map(name => (
                <div key={name} className="group flex items-center justify-between p-3 bg-white hover:bg-indigo-50 rounded-xl cursor-pointer transition-all border border-slate-200 hover:border-indigo-200 shadow-sm">
                  <span className="text-sm font-semibold text-slate-700">{name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeVariable(name); }}
                    className="p-1.5 text-slate-400 group-hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Valeurs de la variable sélectionnée */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(variables).map(([name, values]) => (
                <div key={name} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {name}
                    </h4>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {values.length} items
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] p-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    {values.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-600 shadow-sm group">
                        <span>{val}</span>
                        <button onClick={() => removeValue(name, idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ajouter une valeur + Entrée" 
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addValue(name, (e.target as HTMLInputElement).value);
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

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Terminer la configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariableManager;
