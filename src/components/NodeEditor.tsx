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

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '15px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: '5px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    marginBottom: '10px'
  };

  return (
    <div style={{
      width: '400px',
      background: '#fff',
      borderLeft: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: '-4px 0 10px rgba(0,0,0,0.05)',
      overflowY: 'auto',
      padding: '20px',
      zIndex: 50
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Éditer Nœud</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onDelete(node.id)} style={{ padding: '5px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Supprimer">
            <Trash2 size={20} />
          </button>
          <button onClick={onClose} style={{ padding: '5px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Général */}
      <div style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '15px' }}>
          <Settings size={16} /> Général
        </h3>
        <label style={labelStyle}>ID (Lecture seule)</label>
        <input style={{ ...inputStyle, background: '#f8fafc' }} value={data.id} readOnly />
        
        <label style={labelStyle}>Label</label>
        <input style={inputStyle} value={data.label || ''} onChange={(e) => handleChange('label', e.target.value)} />
        
        <label style={labelStyle}>Type</label>
        <select style={inputStyle} value={data.type} onChange={(e) => handleChange('type', e.target.value)}>
          <option value="menu">Menu</option>
          <option value="filter">Filter</option>
          <option value="results">Results</option>
          <option value="widget">Widget</option>
        </select>
        
        <label style={labelStyle}>Niveau (Level)</label>
        <input type="number" style={inputStyle} value={data.level} onChange={(e) => handleChange('level', parseInt(e.target.value))} />
      </div>

      {/* Audio */}
      <div style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '15px' }}>
          <Music size={16} /> Audio
        </h3>
        <label style={labelStyle}>Fichiers audio contexte</label>
        {data.audio?.context?.map((audio: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
            <input style={{ ...inputStyle, marginBottom: 0 }} value={audio} onChange={(e) => {
              const newCtx = [...data.audio.context];
              newCtx[i] = e.target.value;
              handleChange('audio.context', newCtx);
            }} />
            <button onClick={() => removeAudio(i)} style={{ padding: '5px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button onClick={addAudio} style={{ width: '100%', padding: '5px', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          <Plus size={14} /> Ajouter Audio
        </button>
        
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={data.audio?.auto_play} onChange={(e) => handleChange('audio.auto_play', e.target.checked)} id="autoplay" />
          <label htmlFor="autoplay" style={{ fontSize: '14px' }}>Lecture automatique</label>
        </div>
      </div>

      {/* Options */}
      {(data.type === 'menu' || data.type === 'filter') && (
        <div style={sectionStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '15px' }}>
            <List size={16} /> Options ({data.options?.length || 0})
          </h3>
          {data.options?.map((option: any, i: number) => (
            <div key={i} style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Option #{option.number}</span>
                <button onClick={() => removeOption(i)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <label style={labelStyle}>Label</label>
              <input style={inputStyle} value={option.label} onChange={(e) => handleOptionChange(i, 'label', e.target.value)} />
              
              <label style={labelStyle}>Next Node ID</label>
              <select style={inputStyle} value={option.next || ''} onChange={(e) => handleOptionChange(i, 'next', e.target.value)}>
                <option value="">(Aucun)</option>
                {nodes.filter((n: any) => n.id !== data.id).map((n: any) => (
                  <option key={n.id} value={n.id}>{n.id} ({n.data.label})</option>
                ))}
              </select>
            </div>
          ))}
          <button onClick={addOption} style={{ width: '100%', padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Plus size={16} /> Ajouter Option
          </button>
        </div>
      )}

      {/* Filtres spécifiques */}
      {data.type === 'filter' && (
        <div style={sectionStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '15px' }}>
            <Map size={16} /> Paramètres Filtre
          </h3>
          <label style={labelStyle}>Catégorie</label>
          <select style={inputStyle} value={data.filter_category} onChange={(e) => handleChange('filter_category', e.target.value)}>
            <option value="location">Localisation</option>
            <option value="time">Temps</option>
            <option value="market">Marché</option>
            <option value="product">Produit</option>
          </select>
          
          <label style={labelStyle}>Étape (Step)</label>
          <input style={inputStyle} value={data.filter_step || ''} onChange={(e) => handleChange('filter_step', e.target.value)} />
          
          <label style={labelStyle}>Next Filter ID</label>
          <select style={inputStyle} value={data.next_filter || ''} onChange={(e) => handleChange('next_filter', e.target.value)}>
            <option value="">(Aucun)</option>
            {nodes.filter((n: any) => n.id !== data.id && n.data.type === 'filter').map((n: any) => (
              <option key={n.id} value={n.id}>{n.id} ({n.data.label})</option>
            ))}
          </select>
        </div>
      )}

      {/* API */}
      {(data.type === 'filter' || data.type === 'results') && data.api && (
        <div style={sectionStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '15px' }}>
            <Globe size={16} /> API
          </h3>
          <label style={labelStyle}>Endpoint</label>
          <input style={inputStyle} value={data.api.endpoint} onChange={(e) => handleChange('api.endpoint', e.target.value)} />
          
          <label style={labelStyle}>Méthode</label>
          <select style={inputStyle} value={data.api.method} onChange={(e) => handleChange('api.method', e.target.value)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
      )}

      {/* Navigation & Pagination */}
      <div style={{ ...sectionStyle, borderBottom: 'none' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '15px' }}>
          <Map size={16} /> UI & Navigation
        </h3>
        <label style={labelStyle}>Items par page</label>
        <input type="number" style={inputStyle} value={data.pagination?.items_per_page} onChange={(e) => handleChange('pagination.items_per_page', parseInt(e.target.value))} />
        
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={data.navigation?.show_back} onChange={(e) => handleChange('navigation.show_back', e.target.checked)} id="back" />
            <label htmlFor="back" style={{ fontSize: '14px' }}>Back</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={data.navigation?.show_home} onChange={(e) => handleChange('navigation.show_home', e.target.checked)} id="home" />
            <label htmlFor="home" style={{ fontSize: '14px' }}>Home</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeEditor;
