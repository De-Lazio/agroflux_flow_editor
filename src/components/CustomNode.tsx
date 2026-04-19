import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const CustomNode = ({ data, selected }: any) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'menu': return 'border-blue-500 text-blue-600 bg-blue-50';
      case 'filter': return 'border-emerald-500 text-emerald-600 bg-emerald-50';
      case 'results': return 'border-amber-500 text-amber-600 bg-amber-50';
      case 'widget': return 'border-purple-500 text-purple-600 bg-purple-50';
      default: return 'border-slate-400 text-slate-600 bg-slate-50';
    }
  };

  const getHandleColor = (type: string) => {
    switch (type) {
      case 'menu': return '#3b82f6';
      case 'filter': return '#10b981';
      case 'results': return '#f59e0b';
      case 'widget': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  const typeStyle = getTypeColor(data.type);
  const handleColor = getHandleColor(data.type);

  return (
    <div className={`w-[200px] bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${selected ? 'border-red-500 ring-4 ring-red-100 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
      <Handle type="target" position={Position.Top} style={{ background: handleColor, width: '10px', height: '10px' }} />
      
      <div className={`px-3 py-1.5 rounded-t-[6px] border-b text-[10px] font-bold flex justify-between items-center tracking-wider ${typeStyle}`}>
        <span>{data.type.toUpperCase()}</span>
        <span className="opacity-70">ID: {data.id}</span>
      </div>

      <div className="p-3">
        <div className="text-sm font-semibold text-slate-700 leading-tight min-h-[36px] line-clamp-2">
          {data.label || 'Sans label'}
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
          <span>Niveau: {data.level}</span>
          <span className="flex-1 text-right">Options: {data.options?.length || 0}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: handleColor, width: '10px', height: '10px' }} />
    </div>
  );
};

export default memo(CustomNode);
