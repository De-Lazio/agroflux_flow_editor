import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';
import dagre from 'dagre';
import { DEFAULT_AUDIO_FORMAT, DEFAULT_IMAGE_FORMAT } from './resourceInventory';
import { DEFAULT_LANGUAGES } from './languages';
import { createEmptyActiveOverrides } from './activeState';
import type {
  ActiveOverrides,
  FlowData,
  FlowNodes,
  FlowNodeData,
  FlowGraphNodeData,
  FlowVariables,
  FlowHashmaps,
  FlowMappings,
  FlowConfig,
  ResourceFormats
} from '../types/flow';

export const jsonToFlow = (flowData: FlowData) => {
  const nodes: Node<FlowGraphNodeData>[] = [];
  const edges: Edge[] = [];

  Object.entries(flowData.nodes).forEach(([id, node]) => {
    nodes.push({
      id,
      type: 'customNode',
      data: { ...node, id },
      position: { x: 0, y: 0 },
    });

    if (node.type === 'root') {
      node.options.forEach((opt) => {
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
    } else if ('next' in node && node.next) {
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

export interface FlowExtraData {
  entry?: string;
  config?: FlowConfig | null;
  variables?: FlowVariables;
  hashmaps?: FlowHashmaps;
  audioMappings?: FlowMappings;
  resource_formats?: ResourceFormats;
  languages?: string[];
  activeOverrides?: ActiveOverrides;
  hashmapsNoResources?: string[];
}

export const flowToJson = (nodes: Node<FlowGraphNodeData>[], extraData: FlowExtraData = {}): FlowData => {
  const flowNodes: FlowNodes = {};

  nodes.forEach((node) => {
    const { id, ...cleanData } = node.data;
    flowNodes[node.id] = cleanData as FlowNodeData;
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
    resource_formats: extraData.resource_formats || {
      audio: DEFAULT_AUDIO_FORMAT,
      image: DEFAULT_IMAGE_FORMAT
    },
    languages: extraData.languages || DEFAULT_LANGUAGES,
    active_overrides: extraData.activeOverrides || createEmptyActiveOverrides(),
    hashmaps_no_resources: extraData.hashmapsNoResources || [],
    nodes: flowNodes
  };
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 150;

export const getLayoutedElements = <T,>(nodes: Node<T>[], edges: Edge[], direction = 'TB') => {
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
