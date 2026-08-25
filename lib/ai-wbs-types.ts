import { DeliverableItem, ProjectPriority } from './types';

export type WbsParseTargetLevel = 'project_subnodes' | 'node_tasks' | 'task_subtasks';

export interface ParsedDraftDeliverable {
  id: string;
  name: string;
  requirement?: string;
}

export interface ParsedDraftTask {
  id: string;
  name: string;
  owner: string;
  dueDate?: string | null;
  estimatedDuration?: string;
  hasDeliverable?: boolean;
  deliverableRequirement?: string;
  deliverableItems?: ParsedDraftDeliverable[];
  parentId?: string | null;
  selected?: boolean;
}

export interface ParsedDraftNode {
  id: string;
  name: string;
  owner: string;
  estimatedDuration?: string;
  dueDate?: string | null;
  description?: string;
  priority?: ProjectPriority;
  tasks?: ParsedDraftTask[];
  selected?: boolean;
}

export interface WbsParseResult {
  targetLevel: WbsParseTargetLevel;
  summary: string;
  nodes?: ParsedDraftNode[];
  tasks?: ParsedDraftTask[];
}

export interface BatchImportPayload {
  projectId: string;
  targetLevel: WbsParseTargetLevel;
  targetNodeId?: string | null;
  targetTaskId?: string | null;
  author: string;
  nodes?: ParsedDraftNode[];
  tasks?: ParsedDraftTask[];
}

export function createEmptyDraftTask(defaultOwner: string = '', parentId?: string | null): ParsedDraftTask {
  return {
    id: `draft_task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: '',
    owner: defaultOwner,
    dueDate: null,
    estimatedDuration: '',
    hasDeliverable: false,
    deliverableRequirement: '',
    deliverableItems: [],
    parentId: parentId || null,
    selected: true,
  };
}

export function createEmptyDraftNode(defaultOwner: string = ''): ParsedDraftNode {
  return {
    id: `draft_node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: '',
    owner: defaultOwner,
    estimatedDuration: '',
    dueDate: null,
    description: '',
    priority: 'P1',
    tasks: [],
    selected: true,
  };
}
