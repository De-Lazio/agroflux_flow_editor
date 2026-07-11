import { useState } from 'react';
import { X, LayoutGrid, AlertTriangle, FolderOpen, Hammer, UploadCloud } from 'lucide-react';
import { isFileSystemAccessSupported } from '../utils/fsAccess';
import AssetRepositoryTab from './AssetRepositoryTab';
import BuildTab from './BuildTab';
import PublicationTab from './PublicationTab';
import type { FlowData } from '../types/flow';

interface StudioPanelProps {
  getCurrentFlow: () => FlowData;
  onClose: () => void;
}

type StudioTab = 'resources' | 'build' | 'publish';

const TABS: { id: StudioTab; label: string; icon: typeof FolderOpen }[] = [
  { id: 'resources', label: 'Ressources', icon: FolderOpen },
  { id: 'build', label: 'Build', icon: Hammer },
  { id: 'publish', label: 'Publication', icon: UploadCloud }
];

const StudioPanel = ({ getCurrentFlow, onClose }: StudioPanelProps) => {
  const [tab, setTab] = useState<StudioTab>('resources');
  const supported = isFileSystemAccessSupported();

  if (!supported) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 text-amber-600 mb-3">
            <AlertTriangle size={24} />
            <h2 className="text-lg font-bold">Navigateur non supporté</h2>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Le Studio (Ressources, Build, Publication) a besoin d'un accès réel au disque
            (File System Access API), disponible uniquement sur Chrome, Edge ou Opera. Aucun
            mode dégradé n'est proposé pour ces fonctionnalités.
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-white shadow-sm">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Studio</h2>
              <p className="text-sm text-slate-500">Dépôt de ressources, Build et Publication.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-3 bg-slate-50 border-b border-slate-100">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                tab === id
                  ? 'border-indigo-500 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Les trois onglets restent montés (juste masqués) pour ne pas perdre un scan/build
            en cours de consultation quand l'utilisateur change d'onglet puis revient. */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={tab === 'resources' ? '' : 'hidden'}>
            <AssetRepositoryTab getCurrentFlow={getCurrentFlow} />
          </div>
          <div className={tab === 'build' ? '' : 'hidden'}>
            <BuildTab getCurrentFlow={getCurrentFlow} />
          </div>
          <div className={tab === 'publish' ? '' : 'hidden'}>
            <PublicationTab getCurrentFlow={getCurrentFlow} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioPanel;
