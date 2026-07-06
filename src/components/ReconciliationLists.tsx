import { XCircle, CheckCircle2 } from 'lucide-react';

interface ReconciliationListsProps {
  missing: string[];
  orphaned: string[];
}

// Manquants/orphelins : même affichage partagé par AssetRepositoryTab, BuildTab
// et PublicationTab (tous calculent une ReconciliationResult sur des chemins complets).
const ReconciliationLists = ({ missing, orphaned }: ReconciliationListsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <XCircle size={14} /> Manquants ({missing.length})
      </h3>
      <div className="max-h-[160px] overflow-y-auto space-y-1">
        {missing.map((path) => (
          <div key={path} className="text-[11px] font-mono p-1.5 rounded bg-red-50 text-red-700 break-all">
            {path}
          </div>
        ))}
        {missing.length === 0 && <p className="text-xs text-slate-400 italic">Aucun.</p>}
      </div>
    </div>
    <div>
      <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <CheckCircle2 size={14} /> Orphelins ({orphaned.length})
      </h3>
      <div className="max-h-[160px] overflow-y-auto space-y-1">
        {orphaned.map((path) => (
          <div key={path} className="text-[11px] font-mono p-1.5 rounded bg-amber-50 text-amber-700 break-all">
            {path}
          </div>
        ))}
        {orphaned.length === 0 && <p className="text-xs text-slate-400 italic">Aucun.</p>}
      </div>
    </div>
  </div>
);

export default ReconciliationLists;
