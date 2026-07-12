import { useState } from 'react';
import { X, Trash2, Music, List, Map, Globe, Settings, Library, FileText } from 'lucide-react';
import type { Node } from 'reactflow';
import {
  createDefaultRootNode,
  createDefaultGridNode,
  createDefaultResultNode,
  createDefaultCalendrierNode,
  createDefaultPreFilterNode
} from '../utils/nodeFactory';
import type { AudioSequence, FlowNodeData, FlowGraphNodeData, FlowVariables, FlowHashmaps } from '../types/flow';
import { DEFAULT_HTTP_METHOD } from '../types/flow';

interface AudioSequenceEditorProps {
  audio: AudioSequence | undefined;
  onChange: (audio: AudioSequence) => void;
}

const AudioSequenceEditor = ({ audio, onChange }: AudioSequenceEditorProps) => {
  if (!audio) return null;

  const updateField = <K extends keyof AudioSequence>(field: K, value: AudioSequence[K]) => {
    onChange({ ...audio, [field]: value });
  };

  const updateSequence = (index: number, value: string) => {
    const newSeq = [...audio.sequence];
    newSeq[index] = value;
    updateField('sequence', newSeq);
  };

  const addSequenceItem = () => {
    updateField('sequence', [...audio.sequence, '']);
  };

  const removeSequenceItem = (index: number) => {
    updateField('sequence', audio.sequence.filter((_, i) => i !== index));
  };

  return (
    <section className="space-y-4 pt-4 border-t border-slate-100">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Music size={16} /> Configuration Audio (Séquence)
      </h3>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ID Unique de l'audio (Key)</label>
        <input
          className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
          value={audio.key || ''}
          onChange={(e) => updateField('key', e.target.value)}
          placeholder="ex: acheter_produit_intro"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Séquence d'audios</label>
        <div className="space-y-2">
          {audio.sequence.map((item, i) => (
            <div key={i} className="flex gap-1 group">
              <input
                className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                value={item}
                onChange={(e) => updateSequence(i, e.target.value)}
                placeholder="chemin/audio.mp3 ou {variable}"
              />
              <button onClick={() => removeSequenceItem(i)} className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={addSequenceItem}
            className="w-full py-1.5 border border-dashed border-slate-300 rounded text-[10px] font-bold text-slate-400 hover:bg-slate-50 uppercase tracking-wider transition-colors"
          >
            + Ajouter un élément
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fallback (si erreur)</label>
        <input
          className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          value={audio.fallback || ''}
          onChange={(e) => updateField('fallback', e.target.value)}
          placeholder="intro/default.mp3"
        />
      </div>

      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-700 leading-relaxed">
        <strong>💡 Astuces :</strong><br/>
        • Utilisez <code className="bg-amber-100 px-1 rounded">{"{produit}"}</code> pour injecter une variable.<br/>
        • Utilisez <code className="bg-amber-100 px-1 rounded">{"{prix:1000}"}</code> pour un formatage spécifique.
      </div>
    </section>
  );
};

interface NodeEditorProps {
  node: Node<FlowGraphNodeData>;
  nodes: Node<FlowGraphNodeData>[];
  onUpdate: (nodeId: string, newData: FlowGraphNodeData) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  variables: FlowVariables;
  hashmaps: FlowHashmaps;
}

const NodeEditor = ({ node, nodes, onUpdate, onClose, onDelete, variables, hashmaps }: NodeEditorProps) => {
  // Le parent doit monter ce composant avec key={node.id} : ainsi, changer de
  // nœud sélectionné remonte le composant et réinitialise "data" proprement,
  // sans synchroniser un state depuis un prop via un useEffect.
  const [data, setData] = useState<FlowGraphNodeData>(() => ({ ...node.data }));

  const handleDeleteClick = () => {
    if (window.confirm(`Supprimer le nœud "${node.id}" ? Cette action est irréversible (sauf via Undo).`)) {
      onDelete(node.id);
    }
  };

  // Setter générique par chemin ("data_source.endpoint", "options", ...) : la
  // forme exacte des champs dépend du type du nœud, donc cette fonction reste
  // volontairement permissive en interne. Les points d'appel, eux, restent
  // typés grâce au narrowing sur data.type dans le JSX ci-dessous.
  const handleChange = (path: string, value: unknown) => {
    const newData: Record<string, unknown> = { ...data };
    const parts = path.split('.');
    let current: Record<string, unknown> = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    const typedData = newData as unknown as FlowGraphNodeData;
    setData(typedData);
    onUpdate(node.id, typedData);
  };

  // Changer de type régénère une structure propre pour le nouveau type
  // (sinon les champs de l'ancien type restent et le nœud devient incohérent).
  // Les champs communs et rédigés à la main (audio, commentaire, contrat) sont conservés.
  const handleTypeChange = (newType: string) => {
    let freshData: FlowNodeData;
    switch (newType) {
      case 'root': freshData = createDefaultRootNode(node.id); break;
      case 'result': freshData = createDefaultResultNode(node.id); break;
      case 'calendrier': freshData = createDefaultCalendrierNode(node.id); break;
      case 'pre_filter': freshData = createDefaultPreFilterNode(node.id); break;
      default: freshData = createDefaultGridNode(node.id); break;
    }

    const newData = {
      ...freshData,
      id: data.id || node.id,
      audio: data.audio || freshData.audio,
      comment: data.comment || freshData.comment,
      json_response_contrat: data.json_response_contrat || freshData.json_response_contrat
    } as FlowGraphNodeData;

    setData(newData);
    onUpdate(node.id, newData);
  };

  return (
    <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shadow-lg z-50 overflow-hidden">
      <div className="flex justify-between items-center p-5 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">Éditer Nœud</h2>
        <div className="flex gap-2">
          <button onClick={handleDeleteClick} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Supprimer">
            <Trash2 size={20} />
          </button>
          <button onClick={onClose} className="p-1 text-slate-500 hover:bg-slate-50 rounded">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Général */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings size={16} /> Général
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ID</label>
            <input className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50" value={data.id || node.id} readOnly />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Type de Nœud</label>
            <select
              className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={data.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="root">Root (Menu Principal)</option>
              <option value="grid">Grid (Grille Variable)</option>
              <option value="pre_filter">Pre-Filter (Filtre Interne)</option>
              <option value="result">Result (Résultats)</option>
              <option value="calendrier">Calendrier</option>
            </select>
          </div>

          <AudioSequenceEditor
            audio={data.audio || { type: 'sequence', key: `${node.id}_intro`, sequence: [], fallback: 'intro/default.mp3' }}
            onChange={(newAudio) => handleChange('audio', newAudio)}
          />

          {data.type === 'calendrier' && (
            <div className="p-3 bg-violet-50 rounded-lg border border-violet-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-violet-700 uppercase mb-1">Période (jours)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border border-violet-200 rounded text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    value={data.periode || 0}
                    onChange={(e) => handleChange('periode', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-violet-700 uppercase mb-1">Cadran</label>
                  <select
                    className="w-full p-2 border border-violet-200 rounded text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    value={data.cadran || 'centrer'}
                    onChange={(e) => handleChange('cadran', e.target.value)}
                  >
                    <option value="passé">Passé</option>
                    <option value="centrer">Centrer</option>
                    <option value="future">Future</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-violet-700 uppercase mb-1">Paramètre de stockage (Set)</label>
                <input
                  type="text"
                  className="w-full p-2 border border-violet-200 rounded text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white font-mono"
                  placeholder="ex: anime_date"
                  value={data.set || ''}
                  onChange={(e) => handleChange('set', e.target.value)}
                />
                <p className="text-[10px] text-violet-400 mt-1">
                  Nom du paramètre transmis au nœud "result" en aval avec la date choisie.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
              <FileText size={12} /> Commentaire / Documentation
            </label>
            <textarea
              className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] bg-slate-50/50"
              placeholder="Ajouter une note sur ce nœud..."
              value={data.comment || ''}
              onChange={(e) => handleChange('comment', e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1 flex items-center gap-1">
              <Library size={12} /> Contrat de Réponse Backend (JSON)
            </label>
            <textarea
              className="w-full p-2 border border-slate-200 rounded text-[11px] font-mono focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] bg-indigo-50/30"
              placeholder='{ "status": "success", ... }'
              value={data.json_response_contrat || ''}
              onChange={(e) => handleChange('json_response_contrat', e.target.value)}
            />
            <p className="text-[9px] text-slate-400 mt-1 italic">
              Définissez ici le format JSON attendu pour ce nœud.
            </p>
          </div>
        </section>

        {/* GRID : options_source et set */}
        {data.type === 'grid' && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <List size={16} /> Configuration Grid
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Source des options (Variable)</label>
              <select
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={data.options_source || ''}
                onChange={(e) => handleChange('options_source', e.target.value)}
              >
                <option value="">(Choisir une variable)</option>
                <option value="filtre">filtre (Statique)</option>
                {Object.keys(variables || {}).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Paramètre de stockage (Set)</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="ex: departements"
                value={data.set || ''}
                onChange={(e) => handleChange('set', e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Nom du paramètre transmis au nœud "result" en aval (data_source.params) — pas forcément le nom de la variable.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-500">Autoriser le choix « Tout »</span>
              <input
                type="checkbox"
                checked={data.can_choix_all ?? false}
                onChange={(e) => handleChange('can_choix_all', e.target.checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">N'afficher que les options actives</span>
              <input
                type="checkbox"
                checked={data.controle_active ?? false}
                onChange={(e) => handleChange('controle_active', e.target.checked)}
              />
            </div>
          </section>
        )}

        {/* RESULT : data_source */}
        {data.type === 'result' && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Globe size={16} /> Source de Données API
            </h3>
            <div className="flex gap-2">
              <div className="w-28 flex-none">
                <label className="block text-xs font-bold text-slate-500 mb-1">Méthode</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={data.data_source?.method || DEFAULT_HTTP_METHOD}
                  onChange={(e) => handleChange('data_source.method', e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Endpoint</label>
                <input
                  className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={data.data_source?.endpoint || ''}
                  onChange={(e) => handleChange('data_source.endpoint', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Paramètres (Séparés par virgule)</label>
              <input
                className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={data.data_source?.params?.join(', ') || ''}
                onChange={(e) => {
                  // Un champ entièrement vidé doit donner params: [] (avertissement "vide"),
                  // pas [''] (erreur bloquante "nom vide") — mais une virgule en fin de saisie
                  // ("produit, ") doit rester affichable telle quelle pendant que l'utilisateur tape.
                  const raw = e.target.value;
                  const params = raw.trim() === '' ? [] : raw.split(',').map(s => s.trim());
                  handleChange('data_source.params', params);
                }}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-rose-500 uppercase mb-3 flex items-center gap-1">
                <Library size={12} /> Exemples de Réponses (Backend)
              </h4>
              <div className="space-y-3">
                {(data.response_examples || []).map((ex, i) => (
                  <div key={i} className="relative group">
                    <textarea
                      className="w-full p-2 border border-slate-200 rounded text-[10px] font-mono focus:ring-2 focus:ring-rose-500 outline-none min-h-[80px] bg-rose-50/20"
                      value={ex}
                      onChange={(e) => {
                        const newEx = [...(data.response_examples || [])];
                        newEx[i] = e.target.value;
                        handleChange('response_examples', newEx);
                      }}
                    />
                    <button
                      onClick={() => {
                        const newEx = (data.response_examples || []).filter((_, idx) => idx !== i);
                        handleChange('response_examples', newEx);
                      }}
                      className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleChange('response_examples', [...(data.response_examples || []), '{}'])}
                  className="w-full py-2 bg-rose-50 text-rose-600 rounded text-xs font-bold hover:bg-rose-100 transition-colors border border-dashed border-rose-200"
                >
                  + Ajouter un exemple
                </button>
              </div>
            </div>
          </section>
        )}

        {/* PRE_FILTER : cle et filtre_source */}
        {data.type === 'pre_filter' && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Library size={16} /> Configuration Pre-Filter
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Variable de Clé (Filtre)</label>
              <select
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500"
                value={data.cle || ''}
                onChange={(e) => handleChange('cle', e.target.value)}
              >
                <option value="">(Choisir la variable contenant la clé)</option>
                {Object.keys(variables || {}).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Source du HashMap (filtre_source)</label>
              <select
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500"
                value={data.filtre_source || ''}
                onChange={(e) => handleChange('filtre_source', e.target.value)}
              >
                <option value="">(Choisir un hashmap)</option>
                {Object.keys(hashmaps || {}).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Paramètre de stockage (Set)</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                placeholder="ex: marche"
                value={data.set || ''}
                onChange={(e) => handleChange('set', e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Nom du paramètre transmis au nœud "result" en aval avec la valeur choisie dans la liste filtrée.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-500">Autoriser le choix « Tout »</span>
              <input
                type="checkbox"
                checked={data.can_choix_all ?? false}
                onChange={(e) => handleChange('can_choix_all', e.target.checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">N'afficher que les options actives</span>
              <input
                type="checkbox"
                checked={data.controle_active ?? false}
                onChange={(e) => handleChange('controle_active', e.target.checked)}
              />
            </div>
          </section>
        )}

        {/* Navigation pour Root, Grid, Calendrier et Pre-Filter */}
        {(data.type === 'root' || data.type === 'grid' || data.type === 'calendrier' || data.type === 'pre_filter') && (
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Map size={16} /> Navigation
            </h3>

            {data.type === 'root' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500">Options du Menu</label>
                {data.options?.map((opt, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">ID: {opt.id}</span>
                      <button onClick={() => {
                        const newOpts = data.options.filter((_, idx) => idx !== i);
                        handleChange('options', newOpts);
                      }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                    <input placeholder="ID Option" className="w-full p-1.5 border border-slate-200 rounded text-xs" value={opt.id} onChange={(e) => {
                      const newOpts = [...data.options];
                      newOpts[i] = { ...opt, id: e.target.value };
                      handleChange('options', newOpts);
                    }}/>
                    <select className="w-full p-1.5 border border-slate-200 rounded text-xs" value={opt.next || ''} onChange={(e) => {
                      const newOpts = [...data.options];
                      newOpts[i] = { ...opt, next: e.target.value };
                      handleChange('options', newOpts);
                    }}>
                      <option value="">(Suivant)</option>
                      {nodes.filter((n) => n.id !== node.id).map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
                    </select>
                  </div>
                ))}
                <button onClick={() => handleChange('options', [...(data.options || []), { id: 'new', next: '' }])} className="w-full py-2 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200">+ Ajouter Option</button>
              </div>
            )}

            {(data.type === 'grid' || data.type === 'calendrier' || data.type === 'pre_filter') && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nœud Suivant (Next)</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={data.next || ''}
                  onChange={(e) => handleChange('next', e.target.value)}
                >
                  <option value="">(Aucun)</option>
                  {nodes.filter((n) => n.id !== node.id).map((n) => (
                    <option key={n.id} value={n.id}>{n.id} ({n.data.type})</option>
                  ))}
                </select>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default NodeEditor;
