import { useState } from 'react';
import { ListChecks, Upload, Copy, Check, X as XIcon } from 'lucide-react';
import { RESOURCE_EXTENSIONS } from '../utils/resourceInventory';
import type { ResourceGroup } from '../types/flow';

const extractFileNamesFromTree = (treeText: string): Set<string> => {
  const names = new Set<string>();

  treeText.split(/\r?\n/).forEach((line) => {
    // Retire les caractères de dessin d'arborescence (ASCII et Unicode) et les espaces
    const cleaned = line.replace(/^[|\\+\-\s│├└─]+/, '').trim();
    if (!cleaned) return;

    const dotIndex = cleaned.lastIndexOf('.');
    if (dotIndex === -1) return;

    const ext = cleaned.slice(dotIndex + 1).toLowerCase();
    if (RESOURCE_EXTENSIONS.includes(ext)) {
      names.add(cleaned.toLowerCase());
    }
  });

  return names;
};

interface ResourceCheckPanelProps {
  report: ResourceGroup;
}

const ResourceCheckPanel = ({ report }: ResourceCheckPanelProps) => {
  const [command, setCommand] = useState('tree /F /A "C:\\chemin\\vers\\vos\\ressources" > tree.txt');
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('');
  const [treeText, setTreeText] = useState('');
  const [results, setResults] = useState<{ path: string; found: boolean }[] | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      setFileName(file.name);
      setTreeText(event.target?.result as string);
      setResults(null);
    };
    reader.readAsText(file);
  };

  const handleCompare = () => {
    const foundNames = extractFileNamesFromTree(treeText);
    const allResources = [...report.audios, ...report.images];

    const computed = allResources.map((path) => {
      const basename = path.split('/').pop()?.toLowerCase() || '';
      return { path, found: foundNames.has(basename) };
    });

    setResults(computed);
  };

  const foundCount = results?.filter(r => r.found).length || 0;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
        <ListChecks size={18} className="text-emerald-500" />
        Vérification des ressources sur disque
      </h4>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-slate-500 mb-2">
            1. Adaptez le chemin ci-dessous vers votre dossier de ressources, collez la commande dans une invite de commande (cmd) et exécutez-la. Elle génère un fichier <code className="bg-slate-100 px-1 rounded">tree.txt</code>.
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 p-2 border border-slate-200 rounded text-xs font-mono bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-2">
            2. Importez le fichier <code className="bg-slate-100 px-1 rounded">tree.txt</code> généré :
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer w-fit transition-colors">
              <Upload size={14} /> {fileName || 'Choisir tree.txt'}
              <input type="file" accept=".txt" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={handleCompare}
              disabled={!treeText}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Comparer
            </button>
          </div>
        </div>

        {results && (
          <div>
            <p className="text-xs font-bold text-slate-600 mb-2">
              {foundCount} / {results.length} ressources trouvées dans {fileName}
            </p>
            <div className="max-h-[240px] overflow-y-auto space-y-1 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-[11px] font-mono p-1.5 rounded ${r.found ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                  {r.found ? <Check size={12} /> : <XIcon size={12} />}
                  <span className="break-all">{r.path}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCheckPanel;
