import dagre from '@dagrejs/dagre';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { GraphFullData } from '@/lib/graph-service';
import { NodeTreeNode, DbTask } from '@/lib/types';
import { LayoutDirection, GraphFilterState } from './types';

interface BuildGraphParams {
  data: GraphFullData;
  expandedIds: Set<string>;
  filter: GraphFilterState;
  direction: LayoutDirection;
  onToggleExpand: (id: string) => void;
  onToggleAll: () => void;
  onToggleTask: (taskId: string, currentStatus: string) => void;
  onSelectNode: (id: string, type: 'root' | 'project' | 'module' | 'task', rawData?: any) => void;
  isAllExpanded: boolean;
}

const NODE_DIMENSIONS = {
  root: { width: 350, height: 230 },
  project: { width: 310, height: 190 },
  module: { width: 270, height: 155 },
  task: { width: 230, height: 95 },
};

export function buildFlowElements(params: BuildGraphParams): { nodes: Node[]; edges: Edge[] } {
  const {
    data,
    expandedIds,
    filter,
    direction,
    onToggleExpand,
    onToggleAll,
    onToggleTask,
    onSelectNode,
    isAllExpanded,
  } = params;

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. 根节点「项目进度管理」
  const rootId = 'root';
  nodes.push({
    id: rootId,
    type: 'rootNode',
    position: { x: 0, y: 0 },
    data: {
      title: '项目进度管理',
      metrics: data.metrics,
      isAllExpanded,
      onToggleAll,
      onSelectNode: (id: string) => onSelectNode(id, 'root', data.metrics),
      direction,
    },
  });

  // 过滤检查函数
  const isProjectMatch = (project: NodeTreeNode): boolean => {
    if (filter.statusFilter !== 'all') {
      if (filter.statusFilter === 'overdue') {
        if (!project.hasOverdueTasks) return false;
      } else if (project.status !== filter.statusFilter) {
        return false;
      }
    }
    if (filter.priorityFilter !== 'all') {
      if ((project.priority || 'P1') !== filter.priorityFilter) return false;
    }
    if (filter.ownerFilter.trim()) {
      const q = filter.ownerFilter.trim().toLowerCase();
      if (!project.owner.toLowerCase().includes(q)) return false;
    }
    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.trim().toLowerCase();
      const matchName = project.name.toLowerCase().includes(q);
      const matchOwner = project.owner.toLowerCase().includes(q);
      if (!matchName && !matchOwner) return false;
    }
    return true;
  };

  // 递归遍历子节点与任务
  const traverseTree = (
    item: NodeTreeNode,
    parentId: string,
    projectId: string,
    isRootProject: boolean
  ) => {
    const isExpanded = expandedIds.has(item.id);

    if (isRootProject) {
      // 根项目节点
      nodes.push({
        id: item.id,
        type: 'projectNode',
        position: { x: 0, y: 0 },
        data: {
          project: item,
          isExpanded,
          onToggleExpand,
          onSelectNode: (id: string, type: string, d: any) => onSelectNode(id, 'project', d),
          direction,
        },
      });

      edges.push({
        id: `e-${parentId}-${item.id}`,
        source: parentId,
        target: item.id,
        type: 'smoothstep',
        animated: item.status === 'in_progress',
        style: {
          stroke: item.hasOverdueTasks ? '#f43f5e' : item.status === 'done' ? '#10b981' : '#71717a',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: item.hasOverdueTasks ? '#f43f5e' : item.status === 'done' ? '#10b981' : '#71717a',
          width: 14,
          height: 14,
        },
      });
    } else {
      // 子模块节点
      nodes.push({
        id: item.id,
        type: 'moduleNode',
        position: { x: 0, y: 0 },
        data: {
          module: item,
          projectId,
          isExpanded,
          onToggleExpand,
          onSelectNode: (id: string, type: string, d: any) => onSelectNode(id, 'module', d),
          direction,
        },
      });

      edges.push({
        id: `e-${parentId}-${item.id}`,
        source: parentId,
        target: item.id,
        type: 'smoothstep',
        style: {
          stroke: item.hasOverdueTasks ? '#f43f5e' : item.progressPercent === 100 ? '#10b981' : '#a1a1aa',
          strokeWidth: 1.2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: item.hasOverdueTasks ? '#f43f5e' : item.progressPercent === 100 ? '#10b981' : '#a1a1aa',
          width: 12,
          height: 12,
        },
      });
    }

    // 若当前节点未展开，则不递归生成子节点与任务
    if (!isExpanded) return;

    // 1. 直属任务节点
    if (item.tasks && item.tasks.length > 0) {
      item.tasks.forEach((task: DbTask) => {
        const taskId = `task-${task.id}`;
        nodes.push({
          id: taskId,
          type: 'taskNode',
          position: { x: 0, y: 0 },
          data: {
            task,
            projectId,
            nodeId: item.id,
            onToggleTask,
            onSelectNode: (tId: string, type: string, d: any) => onSelectNode(tId, 'task', d),
            direction,
          },
        });

        edges.push({
          id: `e-${item.id}-${taskId}`,
          source: item.id,
          target: taskId,
          type: 'smoothstep',
          style: {
            stroke: task.status === 'done' ? '#10b981' : '#d4d4d8',
            strokeWidth: 1,
            strokeDasharray: task.status === 'done' ? undefined : '3,3',
          },
        });
      });
    }

    // 2. 子模块递归
    if (item.children && item.children.length > 0) {
      item.children.forEach((child: NodeTreeNode) => {
        traverseTree(child, item.id, projectId, false);
      });
    }
  };

  // 遍历所有项目
  data.projects.forEach((proj) => {
    if (!isProjectMatch(proj)) return;
    traverseTree(proj, rootId, proj.id, true);
  });

  // 使用 dagre 进行自动排版
  return applyDagreLayout(nodes, edges, direction);
}

function applyDagreLayout(nodes: Node[], edges: Edge[], direction: LayoutDirection = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isTB = direction === 'TB';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isTB ? 70 : 60,
    ranksep: isTB ? 110 : 130,
    marginx: 60,
    marginy: 60,
  });

  nodes.forEach((node) => {
    const dim = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] || { width: 230, height: 95 };
    dagreGraph.setNode(node.id, { width: dim.width, height: dim.height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const positionedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dim = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] || { width: 230, height: 95 };
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dim.width / 2,
        y: nodeWithPosition.y - dim.height / 2,
      },
    };
  });

  return { nodes: positionedNodes, edges };
}
