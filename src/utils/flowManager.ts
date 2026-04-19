import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';
import dagre from 'dagre';

export const jsonToFlow = (flowData: any) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  Object.values(flowData.nodes).forEach((node: any) => {
    // Add Node
    nodes.push({
      id: node.id,
      type: 'customNode',
      data: { ...node },
      position: { x: 0, y: 0 }, // Will be set by dagre
    });

    // Add Edges from options
    if (node.options) {
      node.options.forEach((option: any) => {
        if (option.next) {
          edges.push({
            id: `e-${node.id}-${option.id}-${option.next}`,
            source: node.id,
            target: option.next,
            label: option.label,
            animated: true,
          });
        }
      });
    }

    // Add Edges from next_filter
    if (node.next_filter) {
      edges.push({
        id: `e-${node.id}-nextfilter-${node.next_filter}`,
        source: node.id,
        target: node.next_filter,
        label: 'next_filter',
        style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
      });
    }
  });

  return getLayoutedElements(nodes, edges);
};

export const flowToJson = (nodes: Node[], _edges: Edge[], version: string = "1.0", defaultLanguage: string = "fon") => {
  const flowNodes: any = {};

  nodes.forEach((node) => {
    flowNodes[node.id] = { ...node.data };
  });

  return {
    version,
    default_language: defaultLanguage,
    nodes: flowNodes,
  };
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 200;
const nodeHeight = 100;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (which is center-based) to top-left
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};
