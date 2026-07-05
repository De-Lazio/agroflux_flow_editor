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
import { jsonToFlow, flowToJson, getLayoutedElements } from './utils/flowManager';
import { validateFlow } from './utils/validator';
import { DEFAULT_AUDIO_FORMAT, DEFAULT_IMAGE_FORMAT } from './utils/resourceInventory';
import {
  createDefaultRootNode,
  createDefaultGridNode,
  createDefaultResultNode,
  createDefaultCalendrierNode,
  createDefaultPreFilterNode
} from './utils/nodeFactory';
import initialFlow from '../flow.json';

const defaultAudioMappings: Record<string, string> = {};

const App = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validation, setValidation] = useState<{errors: string[], warnings: string[], report?: any}>({errors: [], warnings: []});
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [variables, setVariables] = useState<Record<string, string[]>>({});
  const [hashmaps, setHashmaps] = useState<Record<string, Record<string, string[]>>>({});
  const [audioMappings, setAudioMappings] = useState<Record<string, string>>(defaultAudioMappings);
  const [audioFormat, setAudioFormat] = useState<string>(DEFAULT_AUDIO_FORMAT);
  const [imageFormat, setImageFormat] = useState<string>(DEFAULT_IMAGE_FORMAT);
  const [config, setConfig] = useState<any>(null);
  const [dynamicAudio, setDynamicAudio] = useState<any>(null);
  const [entryNode, setEntryNode] = useState<string>("");
  const [isVariableManagerOpen, setIsVariableManagerOpen] = useState(false);
  const [isHashMapManagerOpen, setIsHashMapManagerOpen] = useState(false);
  const [isMappingManagerOpen, setIsMappingManagerOpen] = useState(false);
  const [isFlowSettingsOpen, setIsFlowSettingsOpen] = useState(false);

  // État de verrouillage pour le chargement
  const [isAppReady, setIsAppReady] = useState(false);

  // 1. RESTAURATION INITIALE
  useEffect(() => {
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
            setDynamicAudio(session.dynamicAudio || null);
            setEntryNode(session.entryNode || "");
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
      setVariables((initialFlow as any).variables || {});
      setHashmaps((initialFlow as any).hashmaps || {});
      setAudioMappings((initialFlow as any).audio_mappings || defaultAudioMappings);
      setAudioFormat((initialFlow as any).resource_formats?.audio || DEFAULT_AUDIO_FORMAT);
      setImageFormat((initialFlow as any).resource_formats?.image || DEFAULT_IMAGE_FORMAT);
      setConfig((initialFlow as any).config || null);
      setDynamicAudio((initialFlow as any).dynamic_audio || null);
      setEntryNode((initialFlow as any).entry || "");
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
      dynamicAudio,
      entryNode,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('agroflux_flow_session', JSON.stringify(session));
  }, [nodes, edges, variables, hashmaps, audioMappings, audioFormat, imageFormat, config, dynamicAudio, entryNode, isAppReady]);

  // Ajouter à l'historique seulement quand l'app est prête
  useEffect(() => {
    if (isAppReady && nodes.length > 0 && history.length === 0) {
      addToHistory(nodes, edges);
    }
  }, [isAppReady]);

  const addToHistory = (newNodes: Node[], newEdges: Edge[]) => {
    const newEntry = {
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

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  const updateNodeData = (nodeId: string, newData: any) => {
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

  const updateEdgesFromNodes = (nodeId: string, data: any) => {
    setEdges((eds) => {
      const filteredEdges = eds.filter((e) => e.source !== nodeId);
      const newEdges: Edge[] = [...filteredEdges];

      if (data.type === 'root' && data.options) {
        data.options.forEach((option: any) => {
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
      } else if (data.next) {
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
    setDynamicAudio(null);
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

    let nodeData;
    switch (type) {
      case 'root': nodeData = createDefaultRootNode(id); break;
      case 'result': nodeData = createDefaultResultNode(id); break;
      case 'calendrier': nodeData = createDefaultCalendrierNode(id); break;
      case 'pre_filter': nodeData = createDefaultPreFilterNode(id); break;
      default: nodeData = createDefaultGridNode(id); break;
    }

    const newNode: Node = {
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
    dynamic_audio: dynamicAudio,
    entry: entryNode
  });

  const handleValidate = () => {
    const currentJson = flowToJson(nodes, buildExtraData());
    const results = validateFlow(currentJson);
    setValidation(results);
  };

  const handleSave = () => {
    const currentJson = flowToJson(nodes, buildExtraData());
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentJson, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "flow.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const json = JSON.parse(event.target.result);

          setVariables(json.variables || {});
          setHashmaps(json.hashmaps || {});
          setAudioMappings(json.audio_mappings || defaultAudioMappings);
          setAudioFormat(json.resource_formats?.audio || DEFAULT_AUDIO_FORMAT);
          setImageFormat(json.resource_formats?.image || DEFAULT_IMAGE_FORMAT);
          setConfig(json.config || null);
          setDynamicAudio(json.dynamic_audio || null);
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
    const found = nodes.find(n => n.id.includes(term) || n.data.label?.toLowerCase().includes(term.toLowerCase()));
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
          nodes={nodes}
          onClose={() => setIsFlowSettingsOpen(false)}
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
          onClose={() => setValidation({errors: [], warnings: []})}
        />
      </div>
    </div>
  );
};

export default App;
