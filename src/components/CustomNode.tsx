import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const CustomNode = ({ data, selected }: any) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'menu': return '#3b82f6';
      case 'filter': return '#10b981';
      case 'results': return '#f59e0b';
      case 'widget': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const color = getTypeColor(data.type);

  return (
    <div 
      style={{ 
        background: '#fff', 
        border: `2px solid ${selected ? '#ef4444' : color}`,
        borderRadius: '8px',
        padding: '10px',
        width: '180px',
        boxShadow: selected ? '0 0 10px rgba(239, 68, 68, 0.5)' : '0 4px 6px rgba(0,0,0,0.1)',
        fontSize: '12px',
        transition: 'all 0.2s ease'
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '5px', 
        borderBottom: `1px solid ${color}`,
        color: color,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{data.type.toUpperCase()}</span>
        <span style={{ fontSize: '10px', color: '#666' }}>ID: {data.id}</span>
      </div>

      <div style={{ color: '#333', minHeight: '20px' }}>
        {data.label || 'Sans label'}
      </div>

      <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
        Lvl: {data.level} | Options: {data.options?.length || 0}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
};

export default memo(CustomNode);
