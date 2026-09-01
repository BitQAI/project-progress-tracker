export type ProjectStatus = 'unstarted' | 'in_progress' | 'suspended' | 'done';
export type TaskStatus = 'pending' | 'done';
export type ProjectPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type AttachmentType = 'image' | 'md' | 'pdf' | 'html' | 'other';

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: AttachmentType;
  size?: number;
  uploaded_at?: string;
}

export interface DbNode {
  id: string;
  parent_id: string | null;
  name: string;
  owner: string;
  order: number;
  status: ProjectStatus;
  priority?: ProjectPriority;
  description?: string;
  estimated_duration?: string;
  due_date?: string | null;
  created_at: string;
}

export interface DeliverableItem {
  id: string;
  name: string;
  requirement?: string;
}

export interface DbTask {
  id: string;
  node_id: string;
  parent_id?: string | null;
  name: string;
  owner: string;
  due_date?: string | null;
  estimated_duration?: string;
  status: TaskStatus;
  has_deliverable?: boolean;
  deliverable_requirement?: string;
  deliverable_items?: DeliverableItem[];
  deliverable_submission?: string | null;
  deliverable_submitted_at?: string | null;
  deliverable_attachments?: FileAttachment[];
  done_at: string | null;
  created_at: string;
}

export interface DbTemplate {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface DbTemplateStage {
  id: string;
  template_id: string;
  name: string;
  order: number;
}

export interface DbTemplateDeliverable {
  id: string;
  stage_id: string;
  parent_id?: string | null;
  name: string;
  order: number;
  has_deliverable?: boolean;
  deliverable_requirement?: string;
}

export interface DbComment {
  id: string;
  node_id: string | null;
  task_id: string | null;
  parent_id: string | null;
  author: string;
  content: string;
  created_at: string;
  image_url?: string | null;
  attachments?: FileAttachment[];
}

export interface CommentWithReplies extends DbComment {
  replies?: CommentWithReplies[];
}

export interface DbActivityLog {
  id: string;
  project_id: string;
  node_id?: string | null;
  task_id?: string | null;
  type:
    | 'task_done'
    | 'task_created'
    | 'task_updated'
    | 'task_deleted'
    | 'deliverable_submitted'
    | 'node_created'
    | 'node_updated'
    | 'node_deleted'
    | 'project_created'
    | 'project_updated'
    | 'comment_added'
    | 'briefing';
  title: string;
  detail?: string;
  author: string;
  timestamp: string;
  image_url?: string | null;
  attachments?: FileAttachment[];
}

export interface AppDatabase {
  nodes: DbNode[];
  tasks: DbTask[];
  templates: DbTemplate[];
  templateStages: DbTemplateStage[];
  templateDeliverables: DbTemplateDeliverable[];
  comments: DbComment[];
  activities: DbActivityLog[];
}

export interface ProjectActivityItem {
  id: string;
  type:
    | 'task_done'
    | 'task_created'
    | 'task_updated'
    | 'task_deleted'
    | 'deliverable_submitted'
    | 'node_created'
    | 'node_updated'
    | 'node_deleted'
    | 'project_created'
    | 'project_updated'
    | 'comment_added'
    | 'briefing';
  title: string;
  detail?: string;
  author: string;
  timestamp: string;
  image_url?: string | null;
  attachments?: FileAttachment[];
}

export interface NodeTreeNode extends DbNode {
  tasks: DbTask[];
  children: NodeTreeNode[];
  totalTasksCount: number;
  completedTasksCount: number;
  progressPercent: number;
  hasOverdueTasks: boolean;
  hasDueSoonTasks?: boolean;
  maxOverdueDays?: number;
  latestDueDate: string | null;
  recentActivities?: ProjectActivityItem[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  description?: string;
  estimated_duration?: string;
  completedDuration?: string;
  estimatedTimeDisplay?: string;
  spentDays?: number;
  spentTimeDisplay?: string;
  earlyDays?: number;
  created_at: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  latestDueDate: string | null;
  isOverdue: boolean;
  isDueSoon?: boolean;
  hasRisk?: boolean;
  overdueTasksCount: number;
  dueSoonTasksCount?: number;
  maxOverdueDays: number;
  nodesCount: number;
  latestActivity?: string;
}

export interface DashboardRiskItem {
  id: string;
  kind: 'project' | 'node' | 'task';
  riskType: 'overdue' | 'due_soon';
  riskLabel: string;
  projectId: string;
  projectName: string;
  nodeId?: string;
  nodeName?: string;
  taskId?: string;
  taskName?: string;
  owner: string;
  dueDate: string;
  diffDays: number;
}

export interface DashboardMetrics {
  totalProjects: number;
  averageProgress: number;
  activeProjectsCount: number;
  inProgressCount: number;
  doneCount: number;
  unstartedCount: number;
  suspendedCount: number;
  overdueProjectsCount: number;
  dueSoonProjectsCount?: number;
  riskProjectsCount?: number;
  riskTasksCount?: number;
  riskItems?: DashboardRiskItem[];
  totalTasksCount: number;
  completedTasksCount: number;
  totalEarlyDays: number;
}

export interface TemplateWithStages extends DbTemplate {
  stages: {
    id: string;
    template_id: string;
    name: string;
    order: number;
    deliverables: DbTemplateDeliverable[];
  }[];
}

export interface ExecutiveActivityItem {
  id: string;
  projectId: string;
  projectName: string;
  moduleName?: string;
  type: 'deliverable' | 'milestone' | 'progress' | 'risk_resolve' | 'comment' | 'general';
  categoryBadge: string;
  badgeVariant: 'emerald' | 'blue' | 'purple' | 'amber';
  headline: string;
  summary: string;
  owner: string;
  timestamp: string;
  formattedTime: string;
  imageUrl?: string | null;
  attachments?: FileAttachment[];
}

