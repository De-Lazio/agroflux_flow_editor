import { AlertCircle, X } from 'lucide-react';

const ValidationPanel = ({ errors, warnings, onClose }: any) => {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="absolute top-[70px] left-1/2 -translate-x-1/2 w-[90%] max-w-[800px] bg-white border border-slate-200 rounded-lg shadow-xl z-[100] max-h-[300px] overflow-y-auto p-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
          <AlertCircle size={20} className="text-red-500" />
          Résultats de validation
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors">
          <X size={20} />
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-bold text-red-600 mb-2 uppercase tracking-wider">Erreurs ({errors.length})</div>
          <div className="space-y-1">
            {errors.map((err: string, i: number) => (
              <div key={i} className="p-3 bg-red-50 border-l-4 border-red-500 text-sm text-red-800 rounded-r-md">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <div className="text-sm font-bold text-amber-600 mb-2 uppercase tracking-wider">Avertissements ({warnings.length})</div>
          <div className="space-y-1">
            {warnings.map((warn: string, i: number) => (
              <div key={i} className="p-3 bg-amber-50 border-l-4 border-amber-500 text-sm text-amber-800 rounded-r-md">
                {warn}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;
