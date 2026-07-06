import { useState } from 'react';
import {
  Download,
  Upload,
  PlusCircle,
  Search,
  Undo,
  Redo,
  Layout,
  CheckCircle,
  FileJson,
  FilePlus,
  Database,
  Library,
  FolderTree,
  LayoutGrid,
  Settings,
  ChevronDown,
  Layers
} from 'lucide-react';

interface ToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onNewProject: () => void;
  onOpenVariables: () => void;
  onOpenHashMaps: () => void;
  onOpenMappings: () => void;
  onOpenSettings: () => void;
  onOpenStudio: () => void;
  onAddNode: () => void;
  onAutoLayout: () => void;
  onValidate: () => void;
  onSearch: (term: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const Toolbar = ({
  onSave,
  onLoad,
  onNewProject,
  onOpenVariables,
  onOpenHashMaps,
  onOpenMappings,
  onOpenSettings,
  onOpenStudio,
  onAddNode,
  onAutoLayout,
  onValidate,
  onSearch,
  canUndo,
  canRedo,
  onUndo,
  onRedo
  }: ToolbarProps) => {
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);

  const openDataItem = (action: () => void) => {
    action();
    setIsDataMenuOpen(false);
  };

  return (
    <div className="h-[60px] bg-white border-b border-slate-200 flex items-center px-5 gap-4 shadow-sm z-10">
      <div className="flex items-center gap-2 mr-5">
        <FileJson className="text-blue-500" size={24} />
        <span className="font-bold text-sm text-slate-800 hidden md:inline leading-none">AgroFlux Flow Editor</span>
      </div>

      <div className="flex gap-1">
        <button
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-md cursor-pointer text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          onClick={onNewProject}
          title="Nouveau Projet"
        >
          <FilePlus size={18} /> <span className="hidden lg:inline">Nouveau</span>
        </button>

        <div className="relative">
          <button
            className={`flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors ${isDataMenuOpen ? 'border-slate-300 bg-slate-50 text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setIsDataMenuOpen((v) => !v)}
            title="Données du Flow"
          >
            <Layers size={18} /> <span className="hidden lg:inline">Données</span> <ChevronDown size={14} />
          </button>

          {isDataMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDataMenuOpen(false)} />
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => openDataItem(onOpenVariables)}
                >
                  <Database size={16} /> Variables
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => openDataItem(onOpenHashMaps)}
                >
                  <Library size={16} /> HashMaps
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => openDataItem(onOpenMappings)}
                >
                  <FolderTree size={16} /> Mapping Audio & Image
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => openDataItem(onOpenSettings)}
                >
                  <Settings size={16} /> Paramètres du Flow
                </button>
              </div>
            </>
          )}
        </div>

        <button
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-md cursor-pointer text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          onClick={onLoad}
          title="Charger JSON"
        >
          <Upload size={18} /> <span className="hidden lg:inline">Importer</span>
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-md cursor-pointer text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          onClick={onSave}
          title="Sauvegarder JSON"
        >
          <Download size={18} /> <span className="hidden lg:inline">Enregistrer</span>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 mx-2"></div>

      <button
        className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md cursor-pointer text-sm font-semibold hover:bg-blue-600 transition-colors"
        onClick={onAddNode}
        title="Nouveau Nœud"
      >
        <PlusCircle size={18} /> <span className="hidden sm:inline">+ Nœud</span>
      </button>

      <div className="flex items-center bg-slate-100 rounded-md px-3 flex-1 max-w-[300px]">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par ID ou label..."
          className="bg-transparent border-none p-2 text-sm w-full outline-none text-slate-700"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-1">
        <button
          className="p-2 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo size={18} />
        </button>
        <button
          className="p-2 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo size={18} />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 mx-2"></div>

      <button
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-md cursor-pointer text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        onClick={onAutoLayout}
        title="Réorganiser"
      >
        <Layout size={18} /> <span className="hidden lg:inline">Réorganiser</span>
      </button>

      <button
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-md cursor-pointer text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        onClick={onOpenStudio}
        title="Studio (Ressources, Build, Publication)"
      >
        <LayoutGrid size={18} /> <span className="hidden lg:inline">Studio</span>
      </button>

      <button
        className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-md cursor-pointer text-sm font-semibold hover:bg-emerald-600 transition-colors"
        onClick={onValidate}
        title="Valider le Flow"
      >
        <CheckCircle size={18} /> <span className="hidden lg:inline">Valider</span>
      </button>
    </div>
  );
};

export default Toolbar;
