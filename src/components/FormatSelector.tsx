import { useState } from 'react';
import { LayoutGrid, Database, FileJson, CheckCircle2 } from 'lucide-react';

interface FormatSelectorProps {
  onSelect: (format: 'legacy' | 'dynamic') => void;
  onClose: () => void;
}

const FormatSelector = ({ onSelect, onClose }: FormatSelectorProps) => {
  const [selected, setSelected] = useState<'legacy' | 'dynamic'>('dynamic');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileJson size={28} />
            </div>
            <h2 className="text-2xl font-bold">Nouveau Projet</h2>
          </div>
          <p className="text-indigo-100 opacity-90">Choisissez le format de structure pour votre nouveau flux AgroFlux.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Format du Flux</label>
            
            <div 
              className={`group flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selected === 'dynamic' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}
              onClick={() => setSelected('dynamic')}
            >
              <div className={`p-3 rounded-lg ${selected === 'dynamic' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <LayoutGrid size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold ${selected === 'dynamic' ? 'text-indigo-900' : 'text-slate-700'}`}>AgroFlux Dynamic</h3>
                  {selected === 'dynamic' && <CheckCircle2 size={18} className="text-indigo-500" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Format moderne avec variables réutilisables, navigation simplifiée et nœuds intelligents (Root, Grid, Calendrier).</p>
              </div>
            </div>

            <div 
              className={`group flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selected === 'legacy' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}
              onClick={() => setSelected('legacy')}
            >
              <div className={`p-3 rounded-lg ${selected === 'legacy' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Database size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold ${selected === 'legacy' ? 'text-blue-900' : 'text-slate-700'}`}>Standard (Legacy)</h3>
                  {selected === 'legacy' && <CheckCircle2 size={18} className="text-blue-500" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Structure classique basée sur les types Menu, Filter et Results. Compatible avec les anciens flux.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={() => onSelect(selected)}
              className="flex-[2] px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              Créer le Projet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormatSelector;
