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

export const NODE_DIMENSIONS = {
  root: { width: 350, height: 230 },
  project: { width: 310, height: 185 },
  module: { width: 270, height: 145 },
  task: { width: 235, height: 90 },
  subtask: { width: 220, height: 95 },
};

interface LayoutTreeNode {
  id: string;
  type: 'root' | 'project' | 'module' | 'task' | 'subtask';
  nodeData: Node;
  edgeToParent?: Edge;
  children: LayoutTreeNode[];
  width: number;
  height: number;
  subtreeWidth: number;
  subtreeHeight: number;
  x?: number;
  y?: number;
}

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

  const isTB = direction === 'TB';

  // 布局间距参数（确保充裕留白与视觉呼吸感，绝无重叠挤压）
  const RANK_GAP = isTB ? 140 : 160; // 跨层级间距
  const SIBLING_GAP = isTB ? 50 : 45; // 同级兄弟节点间距
  const PROJECT_BRANCH_GAP = isTB ? 90 : 90; // 项目大分支之间的独立间距
  const MARGIN = 60;

  // 1. 根节点「项目进度管理」
  const rootId = 'root';
  const rootNode: Node = {
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
  };

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

  // 递归构建模块/任务的布局子树
  const buildModuleLayoutTree = (
    item: NodeTreeNode,
    parentId: string,
    projectId: string
  ): LayoutTreeNode => {
    const isExpanded = expandedIds.has(item.id);
    const dim = NODE_DIMENSIONS.module;

    const moduleNode: Node = {
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
    };

    const edge: Edge = {
      id: `e-${parentId}-${item.id}`,
      source: parentId,
      target: item.id,
      type: 'smoothstep',
      style: {
        stroke: item.hasOverdueTasks ? '#f43f5e' : item.progressPercent === 100 ? '#10b981' : '#a1a1aa',
        strokeWidth: 1.3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: item.hasOverdueTasks ? '#f43f5e' : item.progressPercent === 100 ? '#10b981' : '#a1a1aa',
        width: 12,
        height: 12,
      },
    };

    const children: LayoutTreeNode[] = [];

    // 若模块展开，则构建其子任务与子模块树
    if (isExpanded) {
      const allTasks = item.tasks || [];
      // 区分一级任务与二级子任务
      const rootTasks = allTasks.filter(
        (t) => !t.parent_id || !allTasks.some((parent) => parent.id === t.parent_id)
      );

      rootTasks.forEach((parentTask: DbTask) => {
        const taskId = `task-${parentTask.id}`;
        const taskDim = NODE_DIMENSIONS.task;

        const taskNodeObj: Node = {
          id: taskId,
          type: 'taskNode',
          position: { x: 0, y: 0 },
          data: {
            task: parentTask,
            projectId,
            nodeId: item.id,
            isSubtask: false,
            onToggleTask,
            onSelectNode: (tId: string, type: string, d: any) => onSelectNode(tId, 'task', d),
            direction,
          },
        };

        const taskEdge: Edge = {
          id: `e-${item.id}-${taskId}`,
          source: item.id,
          target: taskId,
          type: 'smoothstep',
          style: {
            stroke: parentTask.status === 'done' ? '#10b981' : '#a1a1aa',
            strokeWidth: 1.2,
            strokeDasharray: parentTask.status === 'done' ? undefined : '3,3',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: parentTask.status === 'done' ? '#10b981' : '#a1a1aa',
            width: 10,
            height: 10,
          },
        };

        // 挂载二级子任务
        const subtasks = allTasks.filter((sub) => sub.parent_id === parentTask.id);
        const subtaskChildren: LayoutTreeNode[] = subtasks.map((subtask) => {
          const subtaskId = `task-${subtask.id}`;
          const subtaskDim = NODE_DIMENSIONS.subtask;

          const subtaskNodeObj: Node = {
            id: subtaskId,
            type: 'taskNode',
            position: { x: 0, y: 0 },
            data: {
              task: subtask,
              projectId,
              nodeId: item.id,
              isSubtask: true,
              onToggleTask,
              onSelectNode: (tId: string, type: string, d: any) => onSelectNode(tId, 'task', d),
              direction,
            },
          };

          const subtaskEdge: Edge = {
            id: `e-${taskId}-${subtaskId}`,
            source: taskId,
            target: subtaskId,
            type: 'smoothstep',
            style: {
              stroke: subtask.status === 'done' ? '#10b981' : '#818cf8',
              strokeWidth: 1.2,
              strokeDasharray: subtask.status === 'done' ? undefined : '2,2',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: subtask.status === 'done' ? '#10b981' : '#818cf8',
              width: 10,
              height: 10,
            },
          };

          return {
            id: subtaskId,
            type: 'subtask',
            nodeData: subtaskNodeObj,
            edgeToParent: subtaskEdge,
            children: [],
            width: subtaskDim.width,
            height: subtaskDim.height,
            subtreeWidth: subtaskDim.width,
            subtreeHeight: subtaskDim.height,
          };
        });

        children.push({
          id: taskId,
          type: 'task',
          nodeData: taskNodeObj,
          edgeToParent: taskEdge,
          children: subtaskChildren,
          width: taskDim.width,
          height: taskDim.height,
          subtreeWidth: taskDim.width,
          subtreeHeight: taskDim.height,
        });
      });

      // 递归子模块
      if (item.children && item.children.length > 0) {
        item.children.forEach((child) => {
          children.push(buildModuleLayoutTree(child, item.id, projectId));
        });
      }
    }

    return {
      id: item.id,
      type: 'module',
      nodeData: moduleNode,
      edgeToParent: edge,
      children,
      width: dim.width,
      height: dim.height,
      subtreeWidth: dim.width,
      subtreeHeight: dim.height,
    };
  };

  // 构建项目级树（严格对应仪表盘排序）
  const projectTrees: LayoutTreeNode[] = [];
  const filteredProjects = data.projects.filter(isProjectMatch);

  filteredProjects.forEach((proj) => {
    const isExpanded = expandedIds.has(proj.id);
    const dim = NODE_DIMENSIONS.project;

    const projectNodeObj: Node = {
      id: proj.id,
      type: 'projectNode',
      position: { x: 0, y: 0 },
      data: {
        project: proj,
        isExpanded,
        onToggleExpand,
        onSelectNode: (id: string, type: string, d: any) => onSelectNode(id, 'project', d),
        direction,
      },
    };

    const edge: Edge = {
      id: `e-${rootId}-${proj.id}`,
      source: rootId,
      target: proj.id,
      type: 'smoothstep',
      animated: proj.status === 'in_progress',
      style: {
        stroke: proj.hasOverdueTasks ? '#f43f5e' : proj.status === 'done' ? '#10b981' : '#71717a',
        strokeWidth: 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: proj.hasOverdueTasks ? '#f43f5e' : proj.status === 'done' ? '#10b981' : '#71717a',
        width: 14,
        height: 14,
      },
    };

    const children: LayoutTreeNode[] = [];

    if (isExpanded) {
      // 1. 直属一级任务与二级子任务
      const allTasks = proj.tasks || [];
      const rootTasks = allTasks.filter(
        (t) => !t.parent_id || !allTasks.some((parent) => parent.id === t.parent_id)
      );

      rootTasks.forEach((parentTask: DbTask) => {
        const taskId = `task-${parentTask.id}`;
        const taskDim = NODE_DIMENSIONS.task;

        const taskNodeObj: Node = {
          id: taskId,
          type: 'taskNode',
          position: { x: 0, y: 0 },
          data: {
            task: parentTask,
            projectId: proj.id,
            nodeId: proj.id,
            isSubtask: false,
            onToggleTask,
            onSelectNode: (tId: string, type: string, d: any) => onSelectNode(tId, 'task', d),
            direction,
          },
        };

        const taskEdge: Edge = {
          id: `e-${proj.id}-${taskId}`,
          source: proj.id,
          target: taskId,
          type: 'smoothstep',
          style: {
            stroke: parentTask.status === 'done' ? '#10b981' : '#a1a1aa',
            strokeWidth: 1.2,
            strokeDasharray: parentTask.status === 'done' ? undefined : '3,3',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: parentTask.status === 'done' ? '#10b981' : '#a1a1aa',
            width: 10,
            height: 10,
          },
        };

        const subtasks = allTasks.filter((sub) => sub.parent_id === parentTask.id);
        const subtaskChildren: LayoutTreeNode[] = subtasks.map((subtask) => {
          const subtaskId = `task-${subtask.id}`;
          const subtaskDim = NODE_DIMENSIONS.subtask;

          const subtaskNodeObj: Node = {
            id: subtaskId,
            type: 'taskNode',
            position: { x: 0, y: 0 },
            data: {
              task: subtask,
              projectId: proj.id,
              nodeId: proj.id,
              isSubtask: true,
              onToggleTask,
              onSelectNode: (tId: string, type: string, d: any) => onSelectNode(tId, 'task', d),
              direction,
            },
          };

          const subtaskEdge: Edge = {
            id: `e-${taskId}-${subtaskId}`,
            source: taskId,
            target: subtaskId,
            type: 'smoothstep',
            style: {
              stroke: subtask.status === 'done' ? '#10b981' : '#818cf8',
              strokeWidth: 1.2,
              strokeDasharray: subtask.status === 'done' ? undefined : '2,2',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: subtask.status === 'done' ? '#10b981' : '#818cf8',
              width: 10,
              height: 10,
            },
          };

          return {
            id: subtaskId,
            type: 'subtask',
            nodeData: subtaskNodeObj,
            edgeToParent: subtaskEdge,
            children: [],
            width: subtaskDim.width,
            height: subtaskDim.height,
            subtreeWidth: subtaskDim.width,
            subtreeHeight: subtaskDim.height,
          };
        });

        children.push({
          id: taskId,
          type: 'task',
          nodeData: taskNodeObj,
          edgeToParent: taskEdge,
          children: subtaskChildren,
          width: taskDim.width,
          height: taskDim.height,
          subtreeWidth: taskDim.width,
          subtreeHeight: taskDim.height,
        });
      });

      // 2. 子模块递归
      if (proj.children && proj.children.length > 0) {
        proj.children.forEach((module) => {
          children.push(buildModuleLayoutTree(module, proj.id, proj.id));
        });
      }
    }

    projectTrees.push({
      id: proj.id,
      type: 'project',
      nodeData: projectNodeObj,
      edgeToParent: edge,
      children,
      width: dim.width,
      height: dim.height,
      subtreeWidth: dim.width,
      subtreeHeight: dim.height,
    });
  });

  // 递归计算各子树占用包围盒空间
  const computeSubtreeSizes = (node: LayoutTreeNode) => {
    if (node.children.length === 0) {
      node.subtreeWidth = node.width;
      node.subtreeHeight = node.height;
      return;
    }

    node.children.forEach(computeSubtreeSizes);

    if (!isTB) {
      // LR 横向排版
      const childrenTotalHeight =
        node.children.reduce((acc, c) => acc + c.subtreeHeight, 0) +
        (node.children.length - 1) * SIBLING_GAP;
      const childrenMaxSubtreeWidth = Math.max(...node.children.map((c) => c.subtreeWidth));

      node.subtreeHeight = Math.max(node.height, childrenTotalHeight);
      node.subtreeWidth = node.width + RANK_GAP + childrenMaxSubtreeWidth;
    } else {
      // TB 纵向排版
      const childrenTotalWidth =
        node.children.reduce((acc, c) => acc + c.subtreeWidth, 0) +
        (node.children.length - 1) * SIBLING_GAP;
      const childrenMaxSubtreeHeight = Math.max(...node.children.map((c) => c.subtreeHeight));

      node.subtreeWidth = Math.max(node.width, childrenTotalWidth);
      node.subtreeHeight = node.height + RANK_GAP + childrenMaxSubtreeHeight;
    }
  };

  projectTrees.forEach(computeSubtreeSizes);

  // 递归分配确定性物理坐标
  const assignPositions = (
    node: LayoutTreeNode,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number
  ) => {
    if (!isTB) {
      // LR 模式：节点垂直居中于当前包围盒高度
      node.x = boxX;
      node.y = boxY + (boxHeight - node.height) / 2;

      if (node.children.length > 0) {
        const childStartX = boxX + node.width + RANK_GAP;
        const childrenTotalHeight =
          node.children.reduce((acc, c) => acc + c.subtreeHeight, 0) +
          (node.children.length - 1) * SIBLING_GAP;
        let currentChildY = boxY + (boxHeight - childrenTotalHeight) / 2;

        node.children.forEach((child) => {
          assignPositions(child, childStartX, currentChildY, child.subtreeWidth, child.subtreeHeight);
          currentChildY += child.subtreeHeight + SIBLING_GAP;
        });
      }
    } else {
      // TB 模式：节点水平居中于当前包围盒宽度
      node.x = boxX + (boxWidth - node.width) / 2;
      node.y = boxY;

      if (node.children.length > 0) {
        const childStartY = boxY + node.height + RANK_GAP;
        const childrenTotalWidth =
          node.children.reduce((acc, c) => acc + c.subtreeWidth, 0) +
          (node.children.length - 1) * SIBLING_GAP;
        let currentChildX = boxX + (boxWidth - childrenTotalWidth) / 2;

        node.children.forEach((child) => {
          assignPositions(child, currentChildX, childStartY, child.subtreeWidth, child.subtreeHeight);
          currentChildX += child.subtreeWidth + SIBLING_GAP;
        });
      }
    }
  };

  const finalNodes: Node[] = [];
  const finalEdges: Edge[] = [];

  const rootDim = NODE_DIMENSIONS.root;

  if (projectTrees.length === 0) {
    rootNode.position = { x: MARGIN, y: MARGIN };
    finalNodes.push(rootNode);
    return { nodes: finalNodes, edges: finalEdges };
  }

  if (!isTB) {
    // LR 排版下放置根节点与各项目子树（严格按顺序由上至下平铺）
    const totalProjectsHeight =
      projectTrees.reduce((acc, p) => acc + p.subtreeHeight, 0) +
      (projectTrees.length - 1) * PROJECT_BRANCH_GAP;

    const rootY = MARGIN + Math.max(0, (totalProjectsHeight - rootDim.height) / 2);
    rootNode.position = { x: MARGIN, y: rootY };
    finalNodes.push(rootNode);

    const projectsStartX = MARGIN + rootDim.width + RANK_GAP;
    let currentY = MARGIN;

    projectTrees.forEach((projTree) => {
      assignPositions(projTree, projectsStartX, currentY, projTree.subtreeWidth, projTree.subtreeHeight);
      currentY += projTree.subtreeHeight + PROJECT_BRANCH_GAP;
    });
  } else {
    // TB 排版下放置根节点与各项目子树（严格按顺序由左至右平铺）
    const totalProjectsWidth =
      projectTrees.reduce((acc, p) => acc + p.subtreeWidth, 0) +
      (projectTrees.length - 1) * PROJECT_BRANCH_GAP;

    const rootX = MARGIN + Math.max(0, (totalProjectsWidth - rootDim.width) / 2);
    rootNode.position = { x: rootX, y: MARGIN };
    finalNodes.push(rootNode);

    const projectsStartY = MARGIN + rootDim.height + RANK_GAP;
    let currentX = MARGIN;

    projectTrees.forEach((projTree) => {
      assignPositions(projTree, currentX, projectsStartY, projTree.subtreeWidth, projTree.subtreeHeight);
      currentX += projTree.subtreeWidth + PROJECT_BRANCH_GAP;
    });
  }

  // 递归收集所有节点与连线
  const collectElements = (node: LayoutTreeNode) => {
    node.nodeData.position = { x: node.x || 0, y: node.y || 0 };
    finalNodes.push(node.nodeData);
    if (node.edgeToParent) {
      finalEdges.push(node.edgeToParent);
    }
    node.children.forEach(collectElements);
  };

  projectTrees.forEach(collectElements);

  return { nodes: finalNodes, edges: finalEdges };
}

