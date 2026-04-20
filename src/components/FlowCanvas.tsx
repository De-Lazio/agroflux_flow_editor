import { memo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  MarkerType,
  SelectionMode
} from 'reactflow';
import type { 
  Node, 
  Edge, 
  OnNodesChange,
  OnEdgesChange,
  OnConnect
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';

const nodeTypes = {
  customNode: CustomNode,
};

const connectionLineStyle = { stroke: '#94a3b8' };

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#64748b',
  },
  style: { stroke: '#64748b', strokeWidth: 2 },
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: (event: React.MouseEvent) => void;
}

const FlowCanvas = ({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeClick, onPaneClick }: FlowCanvasProps) => {
  return (
    <div className="flex-1 relative bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionLineStyle={connectionLineStyle}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        panOnScroll={true}
        panOnDrag={[1, 2]}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor={(node: any) => {
            switch (node.data.type) {
              // Legacy
              case 'menu': return '#3b82f6';
              case 'filter': return '#10b981';
              case 'results': return '#f59e0b';
              case 'widget': return '#8b5cf6';
              // Dynamic
              case 'root': return '#4f46e5';
              case 'grid': return '#06b6d4';
              case 'result': return '#f43f5e';
              case 'calendrier': return '#8b5cf6';
              default: return '#eee';
            }
          }}
          maskColor="rgba(248, 250, 252, 0.7)"
          className="bg-white border border-slate-200 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};

export default memo(FlowCanvas);
