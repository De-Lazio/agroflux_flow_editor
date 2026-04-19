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
import { jsonToFlow, flowToJson, getLayoutedElements } from './utils/flowManager';
import { validateFlow } from './utils/validator';
import { createDefaultMenuNode, createDefaultFilterNode, createDefaultResultsNode, createDefaultWidgetNode } from './utils/nodeFactory';
import initialFlow from '../flow.json';

const App = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validation, setValidation] = useState<{errors: string[], warnings: string[]}>({errors: [], warnings: []});
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load initial flow
  useEffect(() => {
    const { nodes: initialNodes, edges: initialEdges } = jsonToFlow(initialFlow);
    setNodes(initialNodes);
    setEdges(initialEdges);
    addToHistory(initialNodes, initialEdges);
  }, []);

  const addToHistory = (newNodes: Node[], newEdges: Edge[]) => {
    const newEntry = { nodes: JSON.parse(JSON.stringify(newNodes)), edges: JSON.parse(JSON.stringify(newEdges)) };
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
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const addNewNode = () => {
    const type = window.prompt("Type de nœud (menu, filter, results, widget):", "menu");
    if (!type) return;

    const id = window.prompt("ID du nœud:", `node_${Date.now()}`);
    if (!id) return;

    let nodeData;
    switch (type) {
      case 'filter': nodeData = createDefaultFilterNode(id); break;
      case 'results': nodeData = createDefaultResultsNode(id); break;
      case 'widget': nodeData = createDefaultWidgetNode(id); break;
      default: nodeData = createDefaultMenuNode(id); break;
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
    const currentJson = flowToJson(nodes, edges);
    const results = validateFlow(currentJson);
    setValidation(results);
  };

  const handleSave = () => {
    const currentJson = flowToJson(nodes, edges);
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
          const { nodes: newNodes, edges: newEdges } = jsonToFlow(json);
          setNodes(newNodes);
          setEdges(newEdges);
          addToHistory(newNodes, newEdges);
        } catch (err) {
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
    if (found) {
      setSelectedNode(found);
    }
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      <Toolbar 
        onSave={handleSave}
        onLoad={handleLoad}
        onAddNode={addNewNode}
        onAutoLayout={handleAutoLayout}
        onValidate={handleValidate}
        onSearch={handleSearch}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
      />
      
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
