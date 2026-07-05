import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import type { FlowGraphNodeData, FlowNodeType } from '../types/flow';

const CustomNode = ({ data, selected, id }: NodeProps<FlowGraphNodeData>) => {
  const getTypeColor = (type: FlowNodeType) => {
    switch (type) {
      case 'root': return 'border-indigo-600 text-indigo-700 bg-indigo-50';
      case 'grid': return 'border-cyan-500 text-cyan-600 bg-cyan-50';
      case 'result': return 'border-rose-500 text-rose-600 bg-rose-50';
      case 'calendrier': return 'border-violet-500 text-violet-600 bg-violet-50';
      case 'pre_filter': return 'border-amber-500 text-amber-600 bg-amber-50';
      default: return 'border-slate-400 text-slate-600 bg-slate-50';
    }
  };

  const getHandleColor = (type: FlowNodeType) => {
    switch (type) {
      case 'root': return '#4f46e5';
      case 'grid': return '#06b6d4';
      case 'result': return '#f43f5e';
      case 'calendrier': return '#8b5cf6';
      case 'pre_filter': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  const typeStyle = getTypeColor(data.type);
  const handleColor = getHandleColor(data.type);
  const displayId = id || data.id || 'N/A';

  return (
    <div className={`w-[220px] bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${selected ? 'border-red-500 ring-4 ring-red-100 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
      <Handle type="target" position={Position.Top} style={{ background: handleColor, width: '10px', height: '10px' }} />

      <div className={`px-3 py-1.5 rounded-t-[6px] border-b text-[10px] font-bold flex justify-between items-center tracking-wider ${typeStyle}`}>
        <span>{data.type?.toUpperCase()}</span>
        <span className="opacity-70 font-mono">ID: {displayId}</span>
      </div>

      <div className="p-3">
        <div className="text-sm font-semibold text-slate-700 leading-tight min-h-[36px] line-clamp-2">
          {data.audio?.key || 'Sans clé audio'}
        </div>

        {data.type === 'grid' && (
          <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
            <div className="text-[9px] uppercase font-bold text-slate-400">Variable / Source</div>
            <div className="text-[11px] font-medium text-cyan-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              {data.options_source || 'Non définie'}
            </div>
            {data.set && (
              <div className="text-[9px] text-slate-400 italic">Stocke dans: {data.set}</div>
            )}
          </div>
        )}

        {data.type === 'result' && data.data_source && (
          <div className="mt-2 text-[10px] text-slate-500 truncate border-t border-slate-100 pt-2">
            API: {data.data_source.endpoint || 'Non défini'}
          </div>
        )}

        {data.type === 'calendrier' && (
          <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
            <div className="text-[9px] uppercase font-bold text-slate-400">Configuration Temps</div>
            <div className="text-[11px] font-medium text-violet-700 flex flex-col">
              <span>Période: {data.periode || '0'} jours</span>
              <span className="capitalize">Cadran: {data.cadran || 'centrer'}</span>
            </div>
          </div>
        )}

        {data.type === 'pre_filter' && (
          <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
            <div className="text-[9px] uppercase font-bold text-slate-400">HashMap / Clé</div>
            <div className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {data.filtre_source || 'Non source'}
            </div>
            {data.cle && (
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[9px] text-slate-400">Filtré par:</span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{data.cle}</span>
              </div>
            )}
          </div>
        )}

        {data.type === 'root' && (
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
            Options: {data.options?.length || 0}
          </div>
        )}

        {data.comment && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 text-blue-500" title={data.comment}>
            <FileText size={12} />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: handleColor, width: '10px', height: '10px' }} />
    </div>
  );
};

export default memo(CustomNode);
