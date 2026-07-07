import { useState, useCallback, useEffect } from 'react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  ReactFlowProvider
} from 'reactflow';
import type {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange
} from 'reactflow';
import Toolbar from './components/Toolbar';
import FlowCanvas from './components/FlowCanvas';
import NodeEditor from './components/NodeEditor';
import ValidationPanel from './components/ValidationPanel';
import VariableManager from './components/VariableManager';
import HashMapManager from './components/HashMapManager';
import ResourceMappingManager from './components/ResourceMappingManager';
import FlowSettingsManager from './components/FlowSettingsManager';
import ApiImportPanel from './components/ApiImportPanel';
import StudioPanel from './components/StudioPanel';
import { jsonToFlow, flowToJson, getLayoutedElements } from './utils/flowManager';
import { validateFlow } from './utils/validator';
import { buildBackendContract } from './utils/backendContract';
import type { BackendContract } from './utils/backendContract';
import { downloadTextFile } from './utils/download';
import { DEFAULT_AUDIO_FORMAT, DEFAULT_IMAGE_FORMAT } from './utils/resourceInventory';
import { DEFAULT_LANGUAGES } from './utils/languages';
import {
  createDefaultRootNode,
  createDefaultGridNode,
  createDefaultResultNode,
  createDefaultCalendrierNode,
  createDefaultPreFilterNode
} from './utils/nodeFactory';
import initialFlowJson from '../flow.json';
import type {
  FlowData,
  FlowGraphNodeData,
  FlowVariables,
  FlowHashmaps,
  FlowMappings,
  FlowConfig,
  ValidationReport
} from './types/flow';

const initialFlow = initialFlowJson as FlowData;

type FlowGraphNode = Node<FlowGraphNodeData>;

interface HistoryEntry {
  nodes: FlowGraphNode[];
  edges: Edge[];
  variables: FlowVariables;
  hashmaps: FlowHashmaps;
}

interface ValidationState {
  errors: string[];
  warnings: string[];
  report?: ValidationReport;
  backendContract?: BackendContract;
}

const defaultAudioMappings: FlowMappings = {};

const App = () => {
  const [nodes, setNodes] = useState<FlowGraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowGraphNode | null>(null);
  const [validation, setValidation] = useState<ValidationState>({ errors: [], warnings: [] });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [variables, setVariables] = useState<FlowVariables>({});
  const [hashmaps, setHashmaps] = useState<FlowHashmaps>({});
  const [audioMappings, setAudioMappings] = useState<FlowMappings>(defaultAudioMappings);
  const [audioFormat, setAudioFormat] = useState<string>(DEFAULT_AUDIO_FORMAT);
  const [imageFormat, setImageFormat] = useState<string>(DEFAULT_IMAGE_FORMAT);
  const [config, setConfig] = useState<FlowConfig | null>(null);
  const [languages, setLanguages] = useState<string[]>(DEFAULT_LANGUAGES);
  const [entryNode, setEntryNode] = useState<string>("");
  const [isVariableManagerOpen, setIsVariableManagerOpen] = useState(false);
  const [isHashMapManagerOpen, setIsHashMapManagerOpen] = useState(false);
  const [isMappingManagerOpen, setIsMappingManagerOpen] = useState(false);
  const [isFlowSettingsOpen, setIsFlowSettingsOpen] = useState(false);
  const [isApiImportOpen, setIsApiImportOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  // État de verrouillage pour le chargement
  const [isAppReady, setIsAppReady] = useState(false);

  // 1. RESTAURATION INITIALE
  useEffect(() => {
    // Seed direct de l'historique (pas via un effet séparé qui réagirait à
    // isAppReady : on sait ici, au moment de l'init, qu'il s'agit toujours
    // de la toute première entrée).
    const seedHistory = (
      seedNodes: FlowGraphNode[],
      seedEdges: Edge[],
      seedVariables: FlowVariables,
      seedHashmaps: FlowHashmaps
    ) => {
      const entry: HistoryEntry = {
        nodes: JSON.parse(JSON.stringify(seedNodes)),
        edges: JSON.parse(JSON.stringify(seedEdges)),
        variables: JSON.parse(JSON.stringify(seedVariables)),
        hashmaps: JSON.parse(JSON.stringify(seedHashmaps))
      };
      setHistory([entry]);
      setHistoryIndex(0);
    };

    const init = async () => {
      const savedSession = localStorage.getItem('agroflux_flow_session');

      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (session && session.nodes && session.nodes.length > 0) {
            console.log("📦 [Persistence] Restauration de", session.nodes.length, "nœuds...");
            setNodes(session.nodes);
            setEdges(session.edges || []);
            setVariables(session.variables || {});
            setHashmaps(session.hashmaps || {});
            setAudioMappings(session.audioMappings || defaultAudioMappings);
            setAudioFormat(session.audioFormat || DEFAULT_AUDIO_FORMAT);
            setImageFormat(session.imageFormat || DEFAULT_IMAGE_FORMAT);
            setConfig(session.config || null);
            setLanguages(session.languages || DEFAULT_LANGUAGES);
            setEntryNode(session.entryNode || "");
            seedHistory(session.nodes, session.edges || [], session.variables || {}, session.hashmaps || {});
            setIsAppReady(true);
            return;
          }
        } catch (e) {
          console.error("❌ [Persistence] Erreur JSON:", e);
        }
      }

      console.log("📄 [Persistence] Chargement du flux par défaut...");
      const { nodes: initialNodes, edges: initialEdges } = jsonToFlow(initialFlow);
      setNodes(initialNodes);
      setEdges(initialEdges);
      setVariables(initialFlow.variables || {});
      setHashmaps(initialFlow.hashmaps || {});
      setAudioMappings(initialFlow.audio_mappings || defaultAudioMappings);
      setAudioFormat(initialFlow.resource_formats?.audio || DEFAULT_AUDIO_FORMAT);
      setImageFormat(initialFlow.resource_formats?.image || DEFAULT_IMAGE_FORMAT);
      setConfig(initialFlow.config || null);
      setLanguages(initialFlow.languages || DEFAULT_LANGUAGES);
      setEntryNode(initialFlow.entry || "");
      seedHistory(initialNodes, initialEdges, initialFlow.variables || {}, initialFlow.hashmaps || {});
      setIsAppReady(true);
    };

    init();
  }, []);

  // 2. AUTO-SAUVEGARDE
  useEffect(() => {
    if (!isAppReady) return;

    const session = {
      nodes,
      edges,
      variables,
      hashmaps,
      audioMappings,
      audioFormat,
      imageFormat,
      config,
      languages,
      entryNode,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('agroflux_flow_session', JSON.stringify(session));
  }, [nodes, edges, variables, hashmaps, audioMappings, audioFormat, imageFormat, config, languages, entryNode, isAppReady]);

  const addToHistory = (newNodes: FlowGraphNode[], newEdges: Edge[]) => {
    const newEntry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges)),
      variables: JSON.parse(JSON.stringify(variables)),
      hashmaps: JSON.parse(JSON.stringify(hashmaps))
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: FlowGraphNode) => {
    setSelectedNode(node);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  const updateNodeData = (nodeId: string, newData: FlowGraphNodeData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
    updateEdgesFromNodes(nodeId, newData);
  };

  const updateEdgesFromNodes = (nodeId: string, data: FlowGraphNodeData) => {
    setEdges((eds) => {
      const filteredEdges = eds.filter((e) => e.source !== nodeId);
      const newEdges: Edge[] = [...filteredEdges];

      if (data.type === 'root') {
        data.options.forEach((option) => {
          if (option.next) {
            newEdges.push({
              id: `e-${nodeId}-${option.id}-${option.next}`,
              source: nodeId,
              target: option.next,
              label: option.id,
              animated: true,
            });
          }
        });
      } else if ('next' in data && data.next) {
        newEdges.push({
          id: `e-${nodeId}-next-${data.next}`,
          source: nodeId,
          target: data.next,
          animated: true,
        });
      }
      return newEdges;
    });
  };

  const handleNewProject = () => {
    if (!window.confirm("Créer un nouveau projet vide ? Le flow actuel sera perdu s'il n'a pas été exporté.")) return;

    localStorage.removeItem('agroflux_flow_session');
    setNodes([]);
    setEdges([]);
    setVariables({});
    setHashmaps({});
    setAudioMappings(defaultAudioMappings);
    setAudioFormat(DEFAULT_AUDIO_FORMAT);
    setImageFormat(DEFAULT_IMAGE_FORMAT);
    setConfig(null);
    setLanguages(DEFAULT_LANGUAGES);
    setEntryNode("");
    setSelectedNode(null);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const addNewNode = () => {
    const type = window.prompt("Type de nœud (root, grid, pre_filter, result, calendrier):", "grid");
    if (!type) return;

    const id = window.prompt("ID du nœud:", `node_${Date.now()}`);
    if (!id) return;

    let nodeData: FlowGraphNodeData;
    switch (type) {
      case 'root': nodeData = { ...createDefaultRootNode(id), id }; break;
      case 'result': nodeData = { ...createDefaultResultNode(id), id }; break;
      case 'calendrier': nodeData = { ...createDefaultCalendrierNode(id), id }; break;
      case 'pre_filter': nodeData = { ...createDefaultPreFilterNode(id), id }; break;
      default: nodeData = { ...createDefaultGridNode(id), id }; break;
    }

    const newNode: FlowGraphNode = {
      id,
      type: 'customNode',
      data: nodeData,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleAutoLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  };

  const buildExtraData = () => ({
    variables,
    hashmaps,
    audioMappings,
    resource_formats: { audio: audioFormat, image: imageFormat },
    config,
    languages,
    entry: entryNode
  });

  // Reconstruit le FlowData courant à la demande (jamais mis en cache) : utilisé par
  // tout ce qui a besoin d'une lecture ponctuelle de l'état actuel du flow (Valider,
  // Enregistrer, Asset Repository) sans dupliquer cet état ailleurs.
  const getCurrentFlow = () => flowToJson(nodes, buildExtraData());

  const handleValidate = () => {
    const currentJson = getCurrentFlow();
    const results = validateFlow(currentJson);
    setValidation({ ...results, backendContract: buildBackendContract(currentJson) });
  };

  const handleSave = () => {
    downloadTextFile(JSON.stringify(getCurrentFlow(), null, 2), 'flow.json', 'text/json');
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const json = JSON.parse(event.target?.result as string) as FlowData;

          setVariables(json.variables || {});
          setHashmaps(json.hashmaps || {});
          setAudioMappings(json.audio_mappings || defaultAudioMappings);
          setAudioFormat(json.resource_formats?.audio || DEFAULT_AUDIO_FORMAT);
          setImageFormat(json.resource_formats?.image || DEFAULT_IMAGE_FORMAT);
          setConfig(json.config || null);
          setLanguages(json.languages || DEFAULT_LANGUAGES);
          setEntryNode(json.entry || "");

          const { nodes: newNodes, edges: newEdges } = jsonToFlow(json);
          setNodes(newNodes);
          setEdges(newEdges);
          addToHistory(newNodes, newEdges);
        } catch (err) {
          console.error(err);
          alert("Erreur lors du chargement du JSON");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSearch = (term: string) => {
    if (!term) return;
    const found = nodes.find((n) => n.id.includes(term));
    if (found) setSelectedNode(found);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Tant que l'app n'est pas initialisée, on affiche un loader simple
  if (!isAppReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Chargement de votre flux...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      <Toolbar
        onSave={handleSave}
        onLoad={handleLoad}
        onNewProject={handleNewProject}
        onOpenVariables={() => setIsVariableManagerOpen(true)}
        onOpenHashMaps={() => setIsHashMapManagerOpen(true)}
        onOpenMappings={() => setIsMappingManagerOpen(true)}
        onOpenSettings={() => setIsFlowSettingsOpen(true)}
        onOpenApiImport={() => setIsApiImportOpen(true)}
        onOpenStudio={() => setIsStudioOpen(true)}
        onAddNode={addNewNode}
        onAutoLayout={handleAutoLayout}
        onValidate={handleValidate}
        onSearch={handleSearch}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
      />

      {isVariableManagerOpen && (
        <VariableManager
          variables={variables}
          onUpdate={setVariables}
          onClose={() => setIsVariableManagerOpen(false)}
          nodes={nodes}
        />
      )}

      {isHashMapManagerOpen && (
        <HashMapManager
          hashmaps={hashmaps}
          onUpdate={setHashmaps}
          onClose={() => setIsHashMapManagerOpen(false)}
          variables={variables}
        />
      )}

      {isMappingManagerOpen && (
        <ResourceMappingManager
          variables={variables}
          hashmaps={hashmaps}
          mappings={audioMappings}
          onUpdateMappings={setAudioMappings}
          audioFormat={audioFormat}
          imageFormat={imageFormat}
          onAudioFormatChange={setAudioFormat}
          onImageFormatChange={setImageFormat}
          onClose={() => setIsMappingManagerOpen(false)}
        />
      )}

      {isFlowSettingsOpen && (
        <FlowSettingsManager
          entry={entryNode}
          onEntryChange={setEntryNode}
          config={config}
          onConfigChange={setConfig}
          languages={languages}
          onLanguagesChange={setLanguages}
          nodes={nodes}
          onClose={() => setIsFlowSettingsOpen(false)}
        />
      )}

      {isApiImportOpen && (
        <ApiImportPanel
          variables={variables}
          hashmaps={hashmaps}
          onImport={(newVariables, newHashmaps) => {
            setVariables(newVariables);
            setHashmaps(newHashmaps);
          }}
          onClose={() => setIsApiImportOpen(false)}
        />
      )}

      {isStudioOpen && (
        <StudioPanel
          getCurrentFlow={getCurrentFlow}
          onClose={() => setIsStudioOpen(false)}
        />
      )}

      <div className="flex flex-1 relative overflow-hidden">
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
          />
        </ReactFlowProvider>

        {selectedNode && (
          <NodeEditor
            key={selectedNode.id}
            node={selectedNode}
            nodes={nodes}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNode(null)}
            onDelete={deleteNode}
            variables={variables}
            hashmaps={hashmaps}
          />
        )}

        <ValidationPanel
          errors={validation.errors}
          warnings={validation.warnings}
          report={validation.report}
          backendContract={validation.backendContract}
          onClose={() => setValidation({ errors: [], warnings: [] })}
        />
      </div>
    </div>
  );
};

export default App;
