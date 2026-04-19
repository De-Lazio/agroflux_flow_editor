import { useState } from 'react';
import { X, Plus, Trash2, Database, AlertCircle } from 'lucide-react';

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
      <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg text-white">
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

        <div className="flex-1 overflow-y-auto p-6 flex gap-6">
          {/* Liste des variables */}
          <div className="w-1/3 border-r border-slate-100 pr-6 space-y-4">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Variables</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nom de la variable..." 
                className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
              />
              <button 
                onClick={addVariable}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-1">
              {Object.keys(variables).map(name => (
                <div key={name} className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                  <button 
                    onClick={() => removeVariable(name)}
                    className="p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Valeurs de la variable sélectionnée */}
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(variables).map(([name, values]) => (
                <div key={name} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800">{name}</h4>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{values.length} valeurs</span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {values.map((val, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-sm">
                        <span className="text-slate-600">{val}</span>
                        <button onClick={() => removeValue(name, idx)} className="text-slate-300 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ajouter une valeur..." 
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
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

            {Object.keys(variables).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <AlertCircle size={48} />
                <p>Aucune variable déclarée pour le moment.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-all shadow-md"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariableManager;
