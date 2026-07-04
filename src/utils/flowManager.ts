import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';
import dagre from 'dagre';

export const jsonToFlow = (flowData: any) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  Object.entries(flowData.nodes).forEach(([id, node]: [string, any]) => {
    nodes.push({
      id: id,
      type: 'customNode',
      data: { ...node, id },
      position: { x: 0, y: 0 },
    });

    if (node.type === 'root' && node.options) {
      node.options.forEach((opt: any) => {
        if (opt.next) {
          edges.push({
            id: `e-${id}-${opt.id}-${opt.next}`,
            source: id,
            target: opt.next,
            label: opt.id,
            animated: true,
          });
        }
      });
    } else if (node.next) {
      edges.push({
        id: `e-${id}-next-${node.next}`,
        source: id,
        target: node.next,
        animated: true,
      });
    }
  });

  return getLayoutedElements(nodes, edges);
};

export const flowToJson = (nodes: Node[], extraData: any = {}) => {
  const flowNodes: any = {};

  nodes.forEach((node) => {
    const { id, ...cleanData } = node.data;
    flowNodes[node.id] = cleanData;
  });

  return {
    version: "1.0",
    entry: extraData.entry || Object.keys(flowNodes)[0],
    config: extraData.config || {
      audio: { auto_play_prompt: true, auto_play_option: true, pause_between_ms: 600 }
    },
    variables: extraData.variables || {},
    hashmaps: extraData.hashmaps || {},
    audio_mappings: extraData.audioMappings || {},
    dynamic_audio: extraData.dynamic_audio || {},
    nodes: flowNodes
  };
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 150;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 100, 
    nodesep: 80, 
  });

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

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};
