import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';
import dagre from 'dagre';

export const jsonToFlow = (flowData: any) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const isDynamic = flowData.variables || flowData.entry || flowData.dynamic_audio;

  Object.entries(flowData.nodes).forEach(([id, node]: [string, any]) => {
    // Add Node
    nodes.push({
      id: id,
      type: 'customNode',
      data: { ...node, id },
      position: { x: 0, y: 0 },
    });

    if (isDynamic) {
      // Dynamic Format Edges
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
    } else {
      // Legacy Format Edges
      if (node.options) {
        node.options.forEach((option: any) => {
          if (option.next) {
            edges.push({
              id: `e-${id}-${option.id}-${option.next}`,
              source: id,
              target: option.next,
              label: option.label,
              animated: true,
            });
          }
        });
      }

      if (node.next_filter) {
        edges.push({
          id: `e-${id}-nextfilter-${node.next_filter}`,
          source: id,
          target: node.next_filter,
          label: 'next_filter',
          style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
        });
      }
    }
  });

  return getLayoutedElements(nodes, edges);
};

export const flowToJson = (
  nodes: Node[], 
  _edges: Edge[], 
  format: 'legacy' | 'dynamic' = 'legacy',
  extraData: any = {}
) => {
  const flowNodes: any = {};

  nodes.forEach((node) => {
    const { id, ...cleanData } = node.data;
    flowNodes[node.id] = cleanData;
  });

  if (format === 'dynamic') {
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
  }

  return {
    version: extraData.version || "1.0",
    default_language: extraData.defaultLanguage || "fon",
    nodes: flowNodes,
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
