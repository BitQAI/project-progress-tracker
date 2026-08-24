import { NodeTreeNode, DbTask, DashboardMetrics, ProjectStatus, ProjectPriority } from '@/lib/types';

export type LayoutDirection = 'LR' | 'TB';

export interface RootNodeData {
  title: string;
  metrics: DashboardMetrics;
  isAllExpanded?: boolean;
  onToggleAll?: () => void;
  onSelectNode?: (nodeId: string, type: 'root' | 'project' | 'module' | 'task') => void;
  direction?: LayoutDirection;
}

export interface ProjectNodeData {
  project: NodeTreeNode;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSelectNode: (nodeId: string, type: 'project', data: NodeTreeNode) => void;
  direction?: LayoutDirection;
}

export interface ModuleNodeData {
  module: NodeTreeNode;
  projectId: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSelectNode: (nodeId: string, type: 'module', data: NodeTreeNode) => void;
  direction?: LayoutDirection;
}

export interface TaskNodeData {
  task: DbTask;
  projectId: string;
  nodeId: string;
  onToggleTask: (taskId: string, currentStatus: string) => void;
  onSelectNode: (taskId: string, type: 'task', data: DbTask) => void;
  direction?: LayoutDirection;
}

export interface GraphFilterState {
  searchQuery: string;
  statusFilter: 'all' | ProjectStatus | 'overdue';
  priorityFilter: 'all' | ProjectPriority;
  ownerFilter: string;
}
