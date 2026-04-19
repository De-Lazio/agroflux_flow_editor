import { useState, useEffect } from 'react';
import { X, Trash2, Plus, Music, List, Map, Globe, Settings } from 'lucide-react';

const NodeEditor = ({ node, nodes, onUpdate, onClose, onDelete, variables, flowFormat }: any) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (node) {
      setData({ ...node.data });
    }
  }, [node]);

  if (!data) return null;

  const isDynamic = flowFormat === 'dynamic';

  const handleChange = (path: string, value: any) => {
    const newData = { ...data };
    const parts = path.split('.');
    let current = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setData(newData);
    onUpdate(node.id, newData);
  };

  // ... (fonctions handleOptionChange, addOption, etc. restent utiles pour type 'root')

  return (
    <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shadow-lg z-50 overflow-hidden">
      {/* Header inchangé */}
      <div className="flex justify-between items-center p-5 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">Éditer Nœud</h2>
        <div className="flex gap-2">
          <button onClick={() => onDelete(node.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Supprimer">
            <Trash2 size={20} />
          </button>
          <button onClick={onClose} className="p-1 text-slate-500 hover:bg-slate-50 rounded">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Général */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings size={16} /> Général
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ID</label>
            <input className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50" value={data.id || node.id} readOnly />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Type de Nœud</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              value={data.type} 
              onChange={(e) => handleChange('type', e.target.value)}
            >
              {isDynamic ? (
                <>
                  <option value="root">Root (Menu Principal)</option>
                  <option value="grid">Grid (Grille Variable)</option>
                  <option value="result">Result (Résultats)</option>
                </>
              ) : (
                <>
                  <option value="menu">Menu</option>
                  <option value="filter">Filter</option>
                  <option value="results">Results</option>
                  <option value="widget">Widget</option>
                </>
              )}
            </select>
          </div>

          {isDynamic && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Audio Prompt (Chemin mp3)</label>
              <input className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.audio_prompt || ''} onChange={(e) => handleChange('audio_prompt', e.target.value)} />
            </div>
          )}
          
          {!isDynamic && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Label</label>
              <input className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.label || ''} onChange={(e) => handleChange('label', e.target.value)} />
            </div>
          )}
        </section>

        {/* Logique DYNAMIQUE */}
        {isDynamic && (
          <>
            {/* GRID : options_source et set */}
            {data.type === 'grid' && (
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <List size={16} /> Configuration Grid
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Source des options (Variable)</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={data.options_source || ''}
                    onChange={(e) => handleChange('options_source', e.target.value)}
                  >
                    <option value="">(Choisir une variable)</option>
                    <option value="filtre">filtre (Statique)</option>
                    {Object.keys(variables || {}).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Variable de stockage (Set)</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={data.set || ''}
                    onChange={(e) => handleChange('set', e.target.value)}
                  >
                    <option value="">(Aucune)</option>
                    <option value="filtre">filtre</option>
                    {Object.keys(variables || {}).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </section>
            )}

            {/* RESULT : data_source et audio_sequence */}
            {data.type === 'result' && (
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Globe size={16} /> Source de Données API
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Endpoint</label>
                  <input 
                    className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={data.data_source?.endpoint || ''} 
                    onChange={(e) => handleChange('data_source.endpoint', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Paramètres (Séparés par virgule)</label>
                  <input 
                    className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={data.data_source?.params?.join(', ') || ''} 
                    onChange={(e) => handleChange('data_source.params', e.target.value.split(',').map(s => s.trim()))}
                  />
                </div>
                
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Séquence Audio</label>
                  <div className="space-y-2">
                    {(data.audio_sequence || []).map((audio: string, i: number) => (
                      <div key={i} className="flex gap-1">
                        <input 
                          className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                          value={audio} 
                          onChange={(e) => {
                            const newSeq = [...data.audio_sequence];
                            newSeq[i] = e.target.value;
                            handleChange('audio_sequence', newSeq);
                          }}
                        />
                        <button onClick={() => {
                          const newSeq = data.audio_sequence.filter((_: any, idx: number) => idx !== i);
                          handleChange('audio_sequence', newSeq);
                        }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <button onClick={() => handleChange('audio_sequence', [...(data.audio_sequence || []), ''])} className="w-full py-1 border border-dashed border-slate-300 rounded text-xs text-slate-500 hover:bg-slate-50">+ Ajouter Séquence</button>
                  </div>
                </div>
              </section>
            )}

            {/* Navigation pour Root et Grid */}
            {(data.type === 'root' || data.type === 'grid') && (
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Map size={16} /> Navigation
                </h3>
                
                {data.type === 'root' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500">Options du Menu</label>
                    {data.options?.map((opt: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">ID: {opt.id}</span>
                          <button onClick={() => {
                            const newOpts = data.options.filter((_: any, idx: number) => idx !== i);
                            handleChange('options', newOpts);
                          }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                        </div>
                        <input placeholder="ID Option" className="w-full p-1.5 border border-slate-200 rounded text-xs" value={opt.id} onChange={(e) => {
                          const newOpts = [...data.options];
                          newOpts[i] = { ...opt, id: e.target.value };
                          handleChange('options', newOpts);
                        }}/>
                        <select className="w-full p-1.5 border border-slate-200 rounded text-xs" value={opt.next || ''} onChange={(e) => {
                          const newOpts = [...data.options];
                          newOpts[i] = { ...opt, next: e.target.value };
                          handleChange('options', newOpts);
                        }}>
                          <option value="">(Suivant)</option>
                          {nodes.filter((n: any) => n.id !== node.id).map((n: any) => <option key={n.id} value={n.id}>{n.id}</option>)}
                        </select>
                      </div>
                    ))}
                    <button onClick={() => handleChange('options', [...(data.options || []), { id: 'new', next: '' }])} className="w-full py-2 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200">+ Ajouter Option</button>
                  </div>
                )}

                {data.type === 'grid' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nœud Suivant (Next)</label>
                    <select 
                      className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={data.next || ''}
                      onChange={(e) => handleChange('next', e.target.value)}
                    >
                      <option value="">(Aucun)</option>
                      {nodes.filter((n: any) => n.id !== node.id).map((n: any) => (
                        <option key={n.id} value={n.id}>{n.id} ({n.data.label || n.data.type})</option>
                      ))}
                    </select>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Garder la logique LEGACY si format legacy */}
        {!isDynamic && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Niveau (Level)</label>
              <input type="number" className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.level} onChange={(e) => handleChange('level', parseInt(e.target.value))} />
            </div>

            {/* Audio */}
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Music size={16} /> Audio
              </h3>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500">Fichiers audio contexte</label>
                {data.audio?.context?.map((audio: string, i: number) => (
                  <div key={i} className="flex gap-1">
                    <input className="flex-1 p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={audio} onChange={(e) => {
                      const newCtx = [...data.audio.context];
                      newCtx[i] = e.target.value;
                      handleChange('audio.context', newCtx);
                    }} />
                    <button onClick={() => {
                      const newAudio = data.audio.context.filter((_: any, idx: number) => idx !== i);
                      handleChange('audio.context', newAudio);
                    }} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => handleChange('audio.context', [...(data.audio.context || []), ""])} className="w-full py-2 border border-dashed border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50 flex justify-center items-center gap-2">
                  <Plus size={14} /> Ajouter Audio
                </button>
              </div>
            </section>

            {/* Options */}
            {(data.type === 'menu' || data.type === 'filter') && (
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <List size={16} /> Options ({data.options?.length || 0})
                </h3>
                <div className="space-y-3">
                  {data.options?.map((option: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Option #{option.number}</span>
                        <button onClick={() => {
                           const newOptions = data.options.filter((_: any, idx: number) => idx !== i);
                           handleChange('options', newOptions);
                        }} className="text-red-500 hover:bg-red-50 rounded p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Label</label>
                        <input className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={option.label} onChange={(e) => {
                          const newOptions = [...data.options];
                          newOptions[i] = { ...newOptions[i], label: e.target.value };
                          handleChange('options', newOptions);
                        }} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Next Node ID</label>
                        <select className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={option.next || ''} onChange={(e) => {
                          const newOptions = [...data.options];
                          newOptions[i] = { ...newOptions[i], next: e.target.value };
                          handleChange('options', newOptions);
                        }}>
                          <option value="">(Aucun)</option>
                          {nodes.filter((n: any) => n.id !== data.id).map((n: any) => (
                            <option key={n.id} value={n.id}>{n.id} ({n.data.label})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => {
                    const newOption = { id: `option_${Date.now()}`, number: (data.options?.length || 0) + 1, label: "Nouvelle option", next: "" };
                    handleChange('options', [...(data.options || []), newOption]);
                  }} className="w-full py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 flex justify-center items-center gap-2 shadow-sm transition-colors">
                    <Plus size={16} /> Ajouter Option
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NodeEditor;
