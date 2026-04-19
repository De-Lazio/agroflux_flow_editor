import { 
  Download, 
  Upload, 
  PlusCircle, 
  Search, 
  Undo, 
  Redo, 
  Layout, 
  CheckCircle,
  FileJson
} from 'lucide-react';

const Toolbar = ({ 
  onSave, 
  onLoad, 
  onAddNode, 
  onAutoLayout, 
  onValidate,
  onSearch,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}: any) => {
  return (
    <div style={{ 
      height: '60px', 
      background: '#fff', 
      borderBottom: '1px solid #e2e8f0', 
      display: 'flex', 
      alignItems: 'center', 
      padding: '0 20px',
      gap: '15px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
        <FileJson color="#3b82f6" size={24} />
        <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#1e293b' }}>AgroFlux Flow Editor</span>
      </div>

      <div style={{ display: 'flex', gap: '5px' }}>
        <button className="tool-btn" onClick={onLoad} title="Charger JSON">
          <Upload size={18} /> <span>Charger</span>
        </button>
        <button className="tool-btn" onClick={onSave} title="Sauvegarder JSON">
          <Download size={18} /> <span>Sauvegarder</span>
        </button>
      </div>

      <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></div>

      <button className="tool-btn primary" onClick={onAddNode} title="Nouveau Nœud">
        <PlusCircle size={18} /> <span>+ Nœud</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', padding: '0 10px', flex: 1, maxWidth: '300px' }}>
        <Search size={16} color="#64748b" />
        <input 
          type="text" 
          placeholder="Rechercher par ID ou label..." 
          style={{ background: 'transparent', border: 'none', padding: '8px', fontSize: '14px', width: '100%', outline: 'none' }}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '5px' }}>
        <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
          <Undo size={18} />
        </button>
        <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
          <Redo size={18} />
        </button>
      </div>

      <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></div>

      <button className="tool-btn" onClick={onAutoLayout} title="Réorganiser">
        <Layout size={18} /> <span>Réorganiser</span>
      </button>

      <button className="tool-btn success" onClick={onValidate} title="Valider le Flow">
        <CheckCircle size={18} /> <span>Valider</span>
      </button>

      <style>{`
        .tool-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #475569;
          transition: all 0.2s;
        }
        .tool-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .tool-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .tool-btn.primary {
          background: #3b82f6;
          color: #fff;
          border-color: #2563eb;
        }
        .tool-btn.primary:hover {
          background: #2563eb;
        }
        .tool-btn.success {
          background: #10b981;
          color: #fff;
          border-color: #059669;
        }
        .tool-btn.success:hover {
          background: #059669;
        }
        span {
          display: inline;
        }
        @media (max-width: 1000px) {
          span { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
