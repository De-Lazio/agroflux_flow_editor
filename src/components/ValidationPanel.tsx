import { AlertCircle, X, FileText, Music, Image as ImageIcon, Database } from 'lucide-react';

const ValidationPanel = ({ errors, warnings, report, onClose }: any) => {
  if (errors.length === 0 && warnings.length === 0 && !report) return null;

  return (
    <div className="absolute top-[70px] left-1/2 -translate-x-1/2 w-[95%] max-w-[900px] bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] max-h-[80vh] overflow-y-auto p-0 animate-in fade-in slide-in-from-top-4 duration-300 border-t-4 border-t-indigo-500">
      <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
        <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
          <AlertCircle size={20} className={errors.length > 0 ? "text-red-500" : "text-emerald-500"} />
          Résultats de validation & Rapport d'actifs
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {errors.length > 0 && (
          <div>
            <div className="text-xs font-bold text-red-600 mb-2 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Erreurs Bloquantes ({errors.length})
            </div>
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
            <div className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Avertissements ({warnings.length})
            </div>
            <div className="space-y-1">
              {warnings.map((warn: string, i: number) => (
                <div key={i} className="p-3 bg-amber-50 border-l-4 border-amber-500 text-sm text-amber-800 rounded-r-md">
                  {warn}
                </div>
              ))}
            </div>
          </div>
        )}

        {report && (
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" />
              Rapport d'inventaire automatique
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Audios */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3 text-blue-700 font-bold text-xs uppercase">
                  <Music size={14} /> Audios ({report.audios?.length || 0})
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                  {report.audios?.map((a: string, i: number) => (
                    <div key={i} className="text-[10px] font-mono bg-white p-1 rounded border border-blue-50 text-blue-600 break-all">
                      {a}
                    </div>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 mb-3 text-purple-700 font-bold text-xs uppercase">
                  <ImageIcon size={14} /> Images ({report.images?.length || 0})
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                  {report.images?.map((img: string, i: number) => (
                    <div key={i} className="text-[10px] font-mono bg-white p-1 rounded border border-purple-50 text-purple-600 break-all">
                      {img}
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold text-xs uppercase">
                  <Database size={14} /> Variables ({report.variables?.length || 0})
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                  {report.variables?.map((v: string, i: number) => (
                    <div key={i} className="text-[10px] font-mono bg-white p-1 rounded border border-indigo-50 text-indigo-600">
                      {"{"}{v}{"}"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
        <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition-all shadow-lg text-sm">
          Fermer le rapport
        </button>
      </div>
    </div>
  );
};

export default ValidationPanel;
