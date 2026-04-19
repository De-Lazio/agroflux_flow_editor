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
  FilePlus
} from 'lucide-react';

const Toolbar = ({ 
  onSave, 
  onLoad, 
  onNewProject,
  onAddNode, 
  onAutoLayout, 
  onValidate,
  onSearch,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}: any) => {
  return (
    <div className="h-[60px] bg-white border-b border-slate-200 flex items-center px-5 gap-4 shadow-sm z-10">
      <div className="flex items-center gap-2 mr-5">
        <FileJson className="text-blue-500" size={24} />
        <span className="font-bold text-lg text-slate-800 hidden md:inline">AgroFlux Flow Editor</span>
      </div>

      <div className="flex gap-1">
        <button 
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-md cursor-pointer text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          onClick={onNewProject} 
          title="Nouveau Projet"
        >
          <FilePlus size={18} /> <span className="hidden lg:inline">Nouveau</span>
        </button>
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

      <div className="h-6 w-px bg-slate-200"></div>

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

      <div className="h-6 w-px bg-slate-200"></div>

      <button 
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-md cursor-pointer text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        onClick={onAutoLayout} 
        title="Réorganiser"
      >
        <Layout size={18} /> <span className="hidden lg:inline">Réorganiser</span>
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
