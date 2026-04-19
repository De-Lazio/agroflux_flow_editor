import { useState, useEffect } from 'react';
import { X, Trash2, Plus, Music, List, Map, Globe, Settings } from 'lucide-react';

const NodeEditor = ({ node, nodes, onUpdate, onClose, onDelete }: any) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (node) {
      setData({ ...node.data });
    }
  }, [node]);

  if (!data) return null;

  const handleChange = (path: string, value: any) => {
    const newData = { ...data };
    const parts = path.split('.');
    let current = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setData(newData);
    onUpdate(node.id, newData);
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...data.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    handleChange('options', newOptions);
  };

  const addOption = () => {
    const newOption = {
      id: `option_${Date.now()}`,
      number: (data.options?.length || 0) + 1,
      label: "Nouvelle option",
      image: "",
      audio: [],
      keywords: [],
      next: ""
    };
    handleChange('options', [...(data.options || []), newOption]);
  };

  const removeOption = (index: number) => {
    const newOptions = data.options.filter((_: any, i: number) => i !== index);
    handleChange('options', newOptions);
  };

  const addAudio = () => {
    handleChange('audio.context', [...(data.audio.context || []), ""]);
  };

  const removeAudio = (index: number) => {
    const newAudio = data.audio.context.filter((_: any, i: number) => i !== index);
    handleChange('audio.context', newAudio);
  };

  return (
    <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shadow-lg z-50 overflow-hidden">
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
            <label className="block text-xs font-bold text-slate-500 mb-1">ID (Lecture seule)</label>
            <input className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50" value={data.id} readOnly />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Label</label>
            <input className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.label || ''} onChange={(e) => handleChange('label', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
            <select className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.type} onChange={(e) => handleChange('type', e.target.value)}>
              <option value="menu">Menu</option>
              <option value="filter">Filter</option>
              <option value="results">Results</option>
              <option value="widget">Widget</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Niveau (Level)</label>
            <input type="number" className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.level} onChange={(e) => handleChange('level', parseInt(e.target.value))} />
          </div>
        </section>

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
                <button onClick={() => removeAudio(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={addAudio} className="w-full py-2 border border-dashed border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50 flex justify-center items-center gap-2">
              <Plus size={14} /> Ajouter Audio
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={data.audio?.auto_play} onChange={(e) => handleChange('audio.auto_play', e.target.checked)} id="autoplay" className="rounded" />
            <label htmlFor="autoplay" className="text-sm text-slate-700 cursor-pointer">Lecture automatique</label>
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
                    <button onClick={() => removeOption(i)} className="text-red-500 hover:bg-red-50 rounded p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Label</label>
                    <input className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={option.label} onChange={(e) => handleOptionChange(i, 'label', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Next Node ID</label>
                    <select className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={option.next || ''} onChange={(e) => handleOptionChange(i, 'next', e.target.value)}>
                      <option value="">(Aucun)</option>
                      {nodes.filter((n: any) => n.id !== data.id).map((n: any) => (
                        <option key={n.id} value={n.id}>{n.id} ({n.data.label})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <button onClick={addOption} className="w-full py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 flex justify-center items-center gap-2 shadow-sm transition-colors">
                <Plus size={16} /> Ajouter Option
              </button>
            </div>
          </section>
        )}

        {/* Filtres spécifiques */}
        {data.type === 'filter' && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Map size={16} /> Paramètres Filtre
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Catégorie</label>
              <select className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.filter_category} onChange={(e) => handleChange('filter_category', e.target.value)}>
                <option value="location">Localisation</option>
                <option value="time">Temps</option>
                <option value="market">Marché</option>
                <option value="product">Produit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Étape (Step)</label>
              <input className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.filter_step || ''} onChange={(e) => handleChange('filter_step', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Next Filter ID</label>
              <select className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.next_filter || ''} onChange={(e) => handleChange('next_filter', e.target.value)}>
                <option value="">(Aucun)</option>
                {nodes.filter((n: any) => n.id !== data.id && n.data.type === 'filter').map((n: any) => (
                  <option key={n.id} value={n.id}>{n.id} ({n.data.label})</option>
                ))}
              </select>
            </div>
          </section>
        )}

        {/* API */}
        {(data.type === 'filter' || data.type === 'results') && data.api && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Globe size={16} /> API
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Endpoint</label>
              <input className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.api.endpoint} onChange={(e) => handleChange('api.endpoint', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Méthode</label>
              <select className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.api.method} onChange={(e) => handleChange('api.method', e.target.value)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </section>
        )}

        {/* Navigation & Pagination */}
        <section className="space-y-4 pt-4 border-t border-slate-100 mb-8">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Map size={16} /> UI & Navigation
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Items par page</label>
            <input type="number" className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={data.pagination?.items_per_page} onChange={(e) => handleChange('pagination.items_per_page', parseInt(e.target.value))} />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={data.navigation?.show_back} onChange={(e) => handleChange('navigation.show_back', e.target.checked)} id="back" className="rounded text-blue-500 focus:ring-blue-500" />
              <label htmlFor="back" className="text-sm text-slate-700 cursor-pointer">Back</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={data.navigation?.show_home} onChange={(e) => handleChange('navigation.show_home', e.target.checked)} id="home" className="rounded text-blue-500 focus:ring-blue-500" />
              <label htmlFor="home" className="text-sm text-slate-700 cursor-pointer">Home</label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NodeEditor;
