import { getDb, AppDatabase } from './db';
import {
  DbNode,
  DbTask,
  NodeTreeNode,
  ProjectSummary,
  DashboardMetrics,
  ProjectActivityItem,
} from './types';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSubtreeNodeIds(db: AppDatabase, rootId: string): string[] {
  const result: string[] = [rootId];
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = db.nodes.filter((n) => n.parent_id === currentId);
    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }

  return result;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const summaries = await getProjectsSummaryList();
  const total = summaries.length;
  if (total === 0) {
    return {
      totalProjects: 0,
      averageProgress: 0,
      activeProjectsCount: 0,
      inProgressCount: 0,
      doneCount: 0,
      unstartedCount: 0,
      overdueProjectsCount: 0,
      totalTasksCount: 0,
      completedTasksCount: 0,
    };
  }

  let activeProgressSum = 0;
  let inProgressCount = 0;
  let doneCount = 0;
  let unstartedCount = 0;
  let overdueProjectsCount = 0;
  let totalTasksCount = 0;
  let completedTasksCount = 0;

  for (const p of summaries) {
    if (p.status === 'in_progress') {
      inProgressCount++;
      activeProgressSum += p.progress;
    } else if (p.status === 'done') {
      doneCount++;
      activeProgressSum += p.progress;
    } else if (p.status === 'unstarted') {
      unstartedCount++;
    }

    if (p.isOverdue) overdueProjectsCount++;
    totalTasksCount += p.totalTasks;
    completedTasksCount += p.completedTasks;
  }

  const activeProjectsCount = inProgressCount + doneCount;
  const averageProgress =
    activeProjectsCount > 0 ? Math.round(activeProgressSum / activeProjectsCount) : 0;

  return {
    totalProjects: total,
    averageProgress,
    activeProjectsCount,
    inProgressCount,
    doneCount,
    unstartedCount,
    overdueProjectsCount,
    totalTasksCount,
    completedTasksCount,
  };
}

export async function getProjectsSummaryList(): Promise<ProjectSummary[]> {
  const db = getDb();
  
  // 状态权重：进行中 (1) 优先于 未开始 (2) 和 已完成 (3)
  const statusWeight = (s: string) => {
    if (s === 'in_progress') return 1;
    if (s === 'unstarted') return 2;
    if (s === 'done') return 3;
    return 4;
  };

  // 优先级权重：P0 (1) > P1 (2) > P2 (3) > P3 (4)
  const priorityWeight = (p?: string) => {
    if (p === 'P0') return 1;
    if (p === 'P1') return 2;
    if (p === 'P2') return 3;
    if (p === 'P3') return 4;
    return 2; // 默认 P1
  };

  const rootNodes = db.nodes
    .filter((n) => n.parent_id === null)
    .sort((a, b) => {
      // 1. 进行中状态项目排在最前
      const swA = statusWeight(a.status);
      const swB = statusWeight(b.status);
      if (swA !== swB) return swA - swB;

      // 2. 同状态下按优先级排序 (P0 > P1 > P2 > P3)
      const pwA = priorityWeight(a.priority);
      const pwB = priorityWeight(b.priority);
      if (pwA !== pwB) return pwA - pwB;

      // 3. 序号与创建时间
      return (a.order || 0) - (b.order || 0) || b.created_at.localeCompare(a.created_at);
    });

  const todayStr = getTodayString();
  const summaries: ProjectSummary[] = [];

  for (const node of rootNodes) {
    const subtreeIds = new Set(getSubtreeNodeIds(db, node.id));
    const tasks = db.tasks.filter((t) => subtreeIds.has(t.node_id));
    const taskIds = new Set(tasks.map((t) => t.id));

    let completedTasks = 0;
    let overdueTasksCount = 0;
    let latestDueDate: string | null = node.due_date || null;

    for (const t of tasks) {
      if (t.status === 'done') {
        completedTasks++;
      } else if (t.due_date && t.due_date < todayStr) {
        overdueTasksCount++;
      }

      if (!node.due_date && t.due_date) {
        if (!latestDueDate || t.due_date > latestDueDate) {
          latestDueDate = t.due_date;
        }
      }
    }

    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 提取该项目的最近一条动态
    const recentActivities = getProjectRecentActivities(db, node.id, subtreeIds, taskIds, 1);
    const latestActivity = recentActivities.length > 0 ? recentActivities[0].title : undefined;

    summaries.push({
      id: node.id,
      name: node.name,
      owner: node.owner,
      status: node.status,
      priority: node.priority || 'P1',
      description: node.description,
      estimated_duration: node.estimated_duration,
      created_at: node.created_at,
      totalTasks,
      completedTasks,
      progress,
      latestDueDate,
      isOverdue: overdueTasksCount > 0,
      overdueTasksCount,
      nodesCount: subtreeIds.size,
      latestActivity,
    });
  }

  return summaries;
}

export async function getProjectTree(projectId: string): Promise<NodeTreeNode | null> {
  const db = getDb();
  const rootNode = db.nodes.find((n) => n.id === projectId);
  if (!rootNode) return null;

  const todayStr = getTodayString();
  const subtreeIds = new Set(getSubtreeNodeIds(db, projectId));
  const tasks = db.tasks.filter((t) => subtreeIds.has(t.node_id));
  const taskIds = new Set(tasks.map((t) => t.id));

  const tree = buildNodeTreeRecursively(db, rootNode, todayStr);
  tree.recentActivities = getProjectRecentActivities(db, projectId, subtreeIds, taskIds, 15);
  return tree;
}

function getProjectRecentActivities(
  db: AppDatabase,
  rootId: string,
  subtreeIds: Set<string>,
  taskIds: Set<string>,
  limit: number = 20
): ProjectActivityItem[] {
  const activities: ProjectActivityItem[] = [];
  const seenIds = new Set<string>();

  // 1. 读取专属操作日志表（新增任务、编辑任务/模块、交付件提交、删除、状态流转）
  if (Array.isArray(db.activities)) {
    for (const act of db.activities) {
      const matchProject = act.project_id === rootId;
      const matchNode = act.node_id && subtreeIds.has(act.node_id);
      const matchTask = act.task_id && taskIds.has(act.task_id);

      if (matchProject || matchNode || matchTask) {
        if (!seenIds.has(act.id)) {
          seenIds.add(act.id);
          activities.push({
            id: act.id,
            type: act.type,
            title: act.title,
            detail: act.detail,
            author: act.author,
            timestamp: act.timestamp,
          });
        }
      }
    }
  }

  // 2. 兼容早期未记录在 activities 表中的完成任务
  const completedTasks = db.tasks.filter((t) => taskIds.has(t.id) && t.done_at);
  for (const t of completedTasks) {
    const actId = `act_del_${t.id}`;
    if (!seenIds.has(actId) && !activities.some((a) => a.title.includes(`「${t.name}」`))) {
      seenIds.add(actId);
      if (t.has_deliverable && t.deliverable_submission) {
        activities.push({
          id: actId,
          type: 'deliverable_submitted',
          title: `${t.owner} 提交了交付件并完成了「${t.name}」`,
          detail: t.deliverable_submission,
          author: t.owner,
          timestamp: t.deliverable_submitted_at || t.done_at || t.created_at,
        });
      } else {
        activities.push({
          id: `act_done_${t.id}`,
          type: 'task_done',
          title: `${t.owner} 勾选完成了任务「${t.name}」`,
          author: t.owner,
          timestamp: t.done_at || t.created_at,
        });
      }
    }
  }

  // 3. 兼容早期未在 activities 中记录的评论
  const projectComments = db.comments.filter(
    (c) => (c.node_id && subtreeIds.has(c.node_id)) || (c.task_id && taskIds.has(c.task_id))
  );
  for (const c of projectComments) {
    const actId = `act_cmt_${c.id}`;
    if (!seenIds.has(actId) && !activities.some((a) => a.detail === c.content)) {
      seenIds.add(actId);
      activities.push({
        id: actId,
        type: 'comment_added',
        title: `${c.author} 记录了进展备注与证据链`,
        detail: c.content,
        author: c.author,
        timestamp: c.created_at,
      });
    }
  }

  // 4. 按时间倒序排序并截取
  activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return activities.slice(0, limit);
}

function buildNodeTreeRecursively(db: AppDatabase, node: DbNode, todayStr: string): NodeTreeNode {
  // 1. 直属于当前节点的任务
  const tasks: DbTask[] = db.tasks
    .filter((t) => t.node_id === node.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // 2. 子节点递归
  const childNodes = db.nodes
    .filter((n) => n.parent_id === node.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.created_at.localeCompare(b.created_at));

  const children: NodeTreeNode[] = childNodes.map((child) =>
    buildNodeTreeRecursively(db, child, todayStr)
  );

  // 3. 递归汇总任务指标
  let totalTasksCount = tasks.length;
  let completedTasksCount = tasks.filter((t) => t.status === 'done').length;
  let hasOverdueTasks = tasks.some(
    (t) => t.status === 'pending' && t.due_date && t.due_date < todayStr
  );
  let latestDueDate: string | null = node.due_date || null;

  if (!node.due_date) {
    tasks.forEach((t) => {
      if (t.due_date) {
        if (!latestDueDate || t.due_date > latestDueDate) {
          latestDueDate = t.due_date;
        }
      }
    });
  }

  for (const child of children) {
    totalTasksCount += child.totalTasksCount;
    completedTasksCount += child.completedTasksCount;
    if (child.hasOverdueTasks) hasOverdueTasks = true;
    if (!node.due_date && child.latestDueDate) {
      if (!latestDueDate || child.latestDueDate > latestDueDate) {
        latestDueDate = child.latestDueDate;
      }
    }
  }

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
    latestDueDate,
  };
}
