import { AlertCircle, X, FileText, Music, Image as ImageIcon, Database, Download, Layers, Library, Server } from 'lucide-react';
import ErrorsWarningsSummary from './ErrorsWarningsSummary';
import { exportReportAsJson, exportReportAsMarkdown, exportReportAsHtml } from '../utils/reportExport';
import { exportBackendContractAsJson, exportBackendContractAsMarkdown } from '../utils/backendContract';
import type { BackendContract } from '../utils/backendContract';
import { downloadTextFile } from '../utils/download';
import type { ValidationReport } from '../types/flow';

interface ValidationPanelProps {
  errors: string[];
  warnings: string[];
  report?: ValidationReport;
  backendContract?: BackendContract;
  onClose: () => void;
}

const ValidationPanel = ({ errors, warnings, report, backendContract, onClose }: ValidationPanelProps) => {
  if (errors.length === 0 && warnings.length === 0 && !report) return null;

  const handleExportReport = (format: 'json' | 'md' | 'html') => {
    if (!report) return;
    const result = { errors, warnings, report };
    if (format === 'json') downloadTextFile(exportReportAsJson(result), 'rapport_validation.json', 'application/json');
    if (format === 'md') downloadTextFile(exportReportAsMarkdown(result), 'rapport_validation.md', 'text/markdown');
    if (format === 'html') downloadTextFile(exportReportAsHtml(result), 'rapport_validation.html', 'text/html');
  };

  const handleExportBackendContract = (format: 'json' | 'md') => {
    if (!backendContract) return;
    if (format === 'json') downloadTextFile(exportBackendContractAsJson(backendContract), 'backend_contract.json', 'application/json');
    if (format === 'md') downloadTextFile(exportBackendContractAsMarkdown(backendContract), 'backend_contract.md', 'text/markdown');
  };

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
        <ErrorsWarningsSummary errors={errors} warnings={warnings} />

        {report && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" />
                Rapport d'inventaire automatique
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportReport('json')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                  title="Exporter le rapport en JSON"
                >
                  <Download size={14} /> JSON
                </button>
                <button
                  onClick={() => handleExportReport('md')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                  title="Exporter le rapport en Markdown"
                >
                  <Download size={14} /> Markdown
                </button>
                <button
                  onClick={() => handleExportReport('html')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                  title="Exporter le rapport en HTML"
                >
                  <Download size={14} /> HTML
                </button>
              </div>
            </div>

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

            <div className="mt-6 pt-4 border-t border-slate-100">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Détail des ressources générées automatiquement
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ressources générées depuis les Variables */}
                <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                  <div className="flex items-center gap-2 mb-3 text-teal-700 font-bold text-xs uppercase">
                    <Layers size={14} /> Variables ({(report.variableResources?.audios?.length || 0) + (report.variableResources?.images?.length || 0)})
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                    {[...(report.variableResources?.audios || []), ...(report.variableResources?.images || [])].map((r: string, i: number) => (
                      <div key={i} className="text-[10px] font-mono bg-white p-1 rounded border border-teal-50 text-teal-600 break-all">
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ressources générées depuis les HashMaps */}
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-2 mb-3 text-orange-700 font-bold text-xs uppercase">
                    <Library size={14} /> HashMaps ({(report.hashmapResources?.audios?.length || 0) + (report.hashmapResources?.images?.length || 0)})
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                    {[...(report.hashmapResources?.audios || []), ...(report.hashmapResources?.images || [])].map((r: string, i: number) => (
                      <div key={i} className="text-[10px] font-mono bg-white p-1 rounded border border-orange-50 text-orange-600 break-all">
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {backendContract && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Server size={14} className="text-slate-700" />
                    Contrat Backend — routes à implémenter ({backendContract.endpoints.length})
                  </h5>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportBackendContract('json')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                      title="Exporter le contrat backend en JSON"
                    >
                      <Download size={14} /> JSON
                    </button>
                    <button
                      onClick={() => handleExportBackendContract('md')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                      title="Exporter le contrat backend en Markdown"
                    >
                      <Download size={14} /> Markdown
                    </button>
                  </div>
                </div>

                {backendContract.endpoints.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune route détectée (aucun nœud "result" n'a d'endpoint déclaré).</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left text-slate-400 uppercase text-[10px]">
                          <th className="py-1.5 pr-3">Méthode</th>
                          <th className="py-1.5 pr-3">Endpoint</th>
                          <th className="py-1.5 pr-3">Params</th>
                          <th className="py-1.5">Nœuds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backendContract.endpoints.map((ep) => (
                          <tr key={`${ep.method} ${ep.endpoint}`} className="border-t border-slate-100">
                            <td className="py-1.5 pr-3">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{ep.method}</span>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-slate-700 break-all">{ep.endpoint}</td>
                            <td className="py-1.5 pr-3 font-mono text-slate-500">{ep.params.join(', ') || '—'}</td>
                            <td className="py-1.5 text-slate-400">{ep.used_by_nodes.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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
