import { getDb } from './db';
import { ensureDbLoaded } from './db';
import {
  DbNode,
  DbTask,
  NodeTreeNode,
  DashboardMetrics,
} from './types';
import { getDashboardMetrics, syncAllNodeStatuses, getSubtreeNodeIds } from './project-service';
import { getTodayBeijingString } from './date-utils';

export interface GraphFullData {
  metrics: DashboardMetrics;
  projects: NodeTreeNode[];
  timestamp: string;
}

function buildGraphNodeTree(db: any, node: DbNode, todayStr: string): NodeTreeNode {
  // 1. 获取直属任务并按创建时间/名称排序
  const tasks: DbTask[] = db.tasks
    .filter((t: DbTask) => t.node_id === node.id)
    .sort((a: DbTask, b: DbTask) => a.created_at.localeCompare(b.created_at));

  // 2. 递归获取所有子节点
  const childNodes: DbNode[] = db.nodes
    .filter((n: DbNode) => n.parent_id === node.id)
    .sort((a: DbNode, b: DbNode) => (a.order || 0) - (b.order || 0) || a.created_at.localeCompare(b.created_at));

  const children: NodeTreeNode[] = childNodes.map((child) =>
    buildGraphNodeTree(db, child, todayStr)
  );

  // 3. 统计任务与状态
  let totalTasksCount = tasks.length;
  let completedTasksCount = tasks.filter((t) => t.status === 'done').length;
  let maxOverdueDays = 0;

  for (const t of tasks) {
    if (t.status === 'pending' && t.due_date && t.due_date < todayStr) {
      const dDue = new Date(t.due_date.slice(0, 10) + 'T00:00:00').getTime();
      const dToday = new Date(todayStr + 'T00:00:00').getTime();
      const diff = Math.floor((dToday - dDue) / (1000 * 60 * 60 * 24));
      if (diff > maxOverdueDays) maxOverdueDays = diff;
    }
  }

  let latestDueDate: string | null = node.due_date || null;
  if (!node.due_date) {
    for (const t of tasks) {
      if (t.due_date && (!latestDueDate || t.due_date > latestDueDate)) {
        latestDueDate = t.due_date;
      }
    }
  }

  for (const child of children) {
    totalTasksCount += child.totalTasksCount;
    completedTasksCount += child.completedTasksCount;
    if (child.maxOverdueDays && child.maxOverdueDays > maxOverdueDays) {
      maxOverdueDays = child.maxOverdueDays;
    }
    if (!node.due_date && child.latestDueDate) {
      if (!latestDueDate || child.latestDueDate > latestDueDate) {
        latestDueDate = child.latestDueDate;
      }
    }
  }

  const hasOverdueTasks = maxOverdueDays > 0;
  const progressPercent =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return {
    ...node,
    tasks,
    children,
    totalTasksCount,
    completedTasksCount,
    progressPercent,
    hasOverdueTasks,
    maxOverdueDays,
    latestDueDate,
  };
}

export async function getAllProjectsGraphData(): Promise<GraphFullData> {
  await ensureDbLoaded();
  const db = getDb();
  syncAllNodeStatuses(db);

  const metrics = await getDashboardMetrics();
  const todayStr = getTodayBeijingString();

  // 状态权重：进行中 (1) > 暂停中 (2) > 未开始 (3) > 已完成 (4)
  const statusWeight = (s: string) => {
    if (s === 'in_progress') return 1;
    if (s === 'suspended') return 2;
    if (s === 'unstarted') return 3;
    if (s === 'done') return 4;
    return 5;
  };

  const priorityWeight = (p?: string) => {
    if (p === 'P0') return 1;
    if (p === 'P1') return 2;
    if (p === 'P2') return 3;
    if (p === 'P3') return 4;
    return 2;
  };

  const rootNodes = db.nodes
    .filter((n) => n.parent_id === null)
    .sort((a, b) => {
      const swA = statusWeight(a.status);
      const swB = statusWeight(b.status);
      if (swA !== swB) return swA - swB;

      const pwA = priorityWeight(a.priority);
      const pwB = priorityWeight(b.priority);
      if (pwA !== pwB) return pwA - pwB;

      return (a.order || 0) - (b.order || 0) || b.created_at.localeCompare(a.created_at);
    });

  const projects: NodeTreeNode[] = rootNodes.map((root) =>
    buildGraphNodeTree(db, root, todayStr)
  );

  return {
    metrics,
    projects,
    timestamp: new Date().toISOString(),
  };
}
