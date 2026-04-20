import { useState, useCallback, useEffect, useRef } from 'react';
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
import FormatSelector from './components/FormatSelector';
import { jsonToFlow, flowToJson, getLayoutedElements } from './utils/flowManager';
import { validateFlow } from './utils/validator';
import { 
  createDefaultMenuNode, 
  createDefaultFilterNode, 
  createDefaultResultsNode, 
  createDefaultWidgetNode,
  createDefaultRootNode,
  createDefaultGridNode,
  createDefaultResultNode,
  createDefaultCalendrierNode
} from './utils/nodeFactory';
import initialFlow from '../flow.json';

const App = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validation, setValidation] = useState<{errors: string[], warnings: string[]}>({errors: [], warnings: []});
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [flowFormat, setFlowFormat] = useState<'legacy' | 'dynamic'>('legacy');
  const [variables, setVariables] = useState<Record<string, string[]>>({});
  const [config, setConfig] = useState<any>(null);
  const [dynamicAudio, setDynamicAudio] = useState<any>(null);
  const [entryNode, setEntryNode] = useState<string>("");
  const [isVariableManagerOpen, setIsVariableManagerOpen] = useState(false);
  const [isFormatSelectorOpen, setIsFormatSelectorOpen] = useState(false);

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
            setFlowFormat(session.flowFormat || 'legacy');
            setVariables(session.variables || {});
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
      setFlowFormat('legacy');
      setIsAppReady(true);
    };

    init();
  }, []);

  // 2. AUTO-SAUVEGARDE
  useEffect(() => {
    // Ne jamais sauvegarder si l'app n'est pas prête ou si les nœuds ont été vidés par erreur
    if (!isAppReady) return;
    
    // Sécurité : si on a 0 nœuds mais qu'on vient de démarrer, on attend une action utilisateur
    // (sauf si c'est un nouveau projet explicite)
    const session = {
      nodes,
      edges,
      flowFormat,
      variables,
      config,
      dynamicAudio,
      entryNode,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('agroflux_flow_session', JSON.stringify(session));
    // console.log("💾 [Persistence] Sauvegardé");
  }, [nodes, edges, flowFormat, variables, config, dynamicAudio, entryNode, isAppReady]);

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
      variables: JSON.parse(JSON.stringify(variables))
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

      if (flowFormat === 'legacy') {
        if (data.options) {
          data.options.forEach((option: any) => {
            if (option.next) {
              newEdges.push({
                id: `e-${nodeId}-${option.id}-${option.next}`,
                source: nodeId,
                target: option.next,
                label: option.label,
                animated: true,
              });
            }
          });
        }
        if (data.next_filter) {
          newEdges.push({
            id: `e-${nodeId}-nextfilter-${data.next_filter}`,
            source: nodeId,
            target: data.next_filter,
            label: 'next_filter',
            style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
          });
        }
      } else {
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
      }
      return newEdges;
    });
  };

  const handleNewProject = () => {
    setIsFormatSelectorOpen(true);
  };

  const createNewProject = (format: 'legacy' | 'dynamic') => {
    localStorage.removeItem('agroflux_flow_session');
    setNodes([]);
    setEdges([]);
    setVariables({});
    setFlowFormat(format);
    setSelectedNode(null);
    setHistory([]);
    setHistoryIndex(-1);
    setIsFormatSelectorOpen(false);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const addNewNode = () => {
    const isDynamic = flowFormat === 'dynamic';
    const typesPrompt = isDynamic ? "root, grid, result, calendrier" : "menu, filter, results, widget";
    const defaultType = isDynamic ? "grid" : "menu";
    
    const type = window.prompt(`Type de nœud (${typesPrompt}):`, defaultType);
    if (!type) return;

    const id = window.prompt("ID du nœud:", `node_${Date.now()}`);
    if (!id) return;

    let nodeData;
    if (isDynamic) {
      switch (type) {
        case 'root': nodeData = createDefaultRootNode(id); break;
        case 'result': nodeData = createDefaultResultNode(id); break;
        case 'calendrier': nodeData = createDefaultCalendrierNode(id); break;
        default: nodeData = createDefaultGridNode(id); break;
      }
    } else {
      switch (type) {
        case 'filter': nodeData = createDefaultFilterNode(id); break;
        case 'results': nodeData = createDefaultResultsNode(id); break;
        case 'widget': nodeData = createDefaultWidgetNode(id); break;
        default: nodeData = createDefaultMenuNode(id); break;
      }
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

  const handleValidate = () => {
    const extraData = flowFormat === 'dynamic' ? { variables } : { version: "1.0" };
    const currentJson = flowToJson(nodes, edges, flowFormat, extraData);
    const results = validateFlow(currentJson);
    setValidation(results);
  };

  const handleSave = () => {
    const extraData = flowFormat === 'dynamic' ? {
      variables,
      config,
      dynamic_audio: dynamicAudio,
      entry: entryNode
    } : {
      version: "1.0",
      defaultLanguage: "fon"
    };

    const currentJson = flowToJson(nodes, edges, flowFormat, extraData);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentJson, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `flow_${flowFormat}.json`);
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
          const isDynamic = json.variables || json.entry || json.dynamic_audio;
          const format = isDynamic ? 'dynamic' : 'legacy';
          
          setFlowFormat(format);
          if (isDynamic) {
            setVariables(json.variables || {});
            setConfig(json.config || null);
            setDynamicAudio(json.dynamic_audio || null);
            setEntryNode(json.entry || "");
          }

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
        onAddNode={addNewNode}
        onAutoLayout={handleAutoLayout}
        onValidate={handleValidate}
        onSearch={handleSearch}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
        flowFormat={flowFormat}
      />
      
      {isVariableManagerOpen && (
        <VariableManager 
          variables={variables}
          onUpdate={setVariables}
          onClose={() => setIsVariableManagerOpen(false)}
          nodes={nodes}
        />
      )}

      {isFormatSelectorOpen && (
        <FormatSelector 
          onSelect={createNewProject}
          onClose={() => setIsFormatSelectorOpen(false)}
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
            flowFormat={flowFormat}
          />
        )}

        <ValidationPanel 
          errors={validation.errors}
          warnings={validation.warnings}
          onClose={() => setValidation({errors: [], warnings: []})}
        />
      </div>
    </div>
  );
};

export default App;
