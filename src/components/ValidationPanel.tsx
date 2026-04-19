import { AlertCircle, X } from 'lucide-react';

const ValidationPanel = ({ errors, warnings, onClose }: any) => {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '70px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '800px',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
      zIndex: 100,
      maxHeight: '300px',
      overflowY: 'auto',
      padding: '15px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} color="#ef4444" />
          Résultats de validation
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="#64748b" />
        </button>
      </div>

      {errors.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: '5px' }}>Erreurs ({errors.length})</div>
          {errors.map((err: string, i: number) => (
            <div key={i} style={{ 
              padding: '8px', 
              background: '#fef2f2', 
              borderLeft: '4px solid #ef4444', 
              fontSize: '13px',
              marginBottom: '4px',
              color: '#991b1b'
            }}>
              {err}
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <div style={{ fontWeight: 'bold', color: '#f59e0b', marginBottom: '5px' }}>Avertissements ({warnings.length})</div>
          {warnings.map((warn: string, i: number) => (
            <div key={i} style={{ 
              padding: '8px', 
              background: '#fffbeb', 
              borderLeft: '4px solid #f59e0b', 
              fontSize: '13px',
              marginBottom: '4px',
              color: '#92400e'
            }}>
              {warn}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;
