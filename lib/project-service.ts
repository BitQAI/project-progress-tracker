import { getDb, AppDatabase, persistDb } from './db';
import {
  DbNode,
  DbTask,
  NodeTreeNode,
  ProjectSummary,
  DashboardMetrics,
  ProjectActivityItem,
} from './types';
import { getTodayBeijingString, getDueDateRiskInfo } from './date-utils';
import { getDashboardData } from './dashboard-service';
import {
  parseDurationToDays,
  calculateSpentDuration,
  calculateMaxOverdueDays,
  calculateProjectEarlyDays,
  calculateEstimatedTimeDisplay,
  calculateCompletedDuration,
} from './project-calc-utils';

export {
  parseDurationToDays,
  calculateSpentDuration,
  calculateMaxOverdueDays,
  calculateProjectEarlyDays,
  calculateEstimatedTimeDisplay,
  calculateCompletedDuration,
};

function getTodayString(): string {
  return getTodayBeijingString();
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
  const data = await getDashboardData();
  return data.metrics;
}

export async function getProjectsSummaryList(): Promise<ProjectSummary[]> {
  const data = await getDashboardData();
  return data.summaries;
}

export function syncAllNodeStatuses(db: AppDatabase) {
  let changed = false;
  for (const node of db.nodes) {
    const subtreeIds = new Set(getSubtreeNodeIds(db, node.id));
    const tasks = db.tasks.filter((t) => subtreeIds.has(t.node_id));
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let computedStatus = node.status;
    if (progress === 0) {
      computedStatus = 'unstarted';
    } else if (progress === 100) {
      computedStatus = 'done';
    } else if (node.status === 'unstarted' || node.status === 'done') {
      computedStatus = 'in_progress';
    }

    if (node.status !== computedStatus) {
      node.status = computedStatus;
      changed = true;
    }
  }
  if (changed) {
    persistDb().catch((err) => console.error('Failed to persist auto-synced statuses:', err));
  }
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
  tree.recentActivities = getProjectRecentActivities(db, projectId, subtreeIds, taskIds, 1000);
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
  const seenEventKeys = new Set<string>();
  const seenCommentKeys = new Set<string>();

  const isImage = (url?: string | null) => {
    if (!url) return false;
    return (
      url.startsWith('http') &&
      (!!url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || url.includes('files.bitqai.com/protrack/'))
    );
  };

  // 1. 读取专属操作日志表
  if (Array.isArray(db.activities)) {
    for (const act of db.activities) {
      const matchProject = act.project_id === rootId;
      const matchNode = act.node_id && subtreeIds.has(act.node_id);
      const matchTask = act.task_id && taskIds.has(act.task_id);

      if (matchProject || matchNode || matchTask) {
        if (!seenIds.has(act.id)) {
          const detailStr = (act.detail || '').trim();
          const eventKey = `${act.type}_${act.author}_${detailStr.slice(0, 80)}_${act.timestamp.slice(0, 16)}`;
          if (seenEventKeys.has(eventKey)) continue;

          seenIds.add(act.id);
          seenEventKeys.add(eventKey);

          if (act.type === 'comment_added' && detailStr) {
            seenCommentKeys.add(`${act.author}_${detailStr}`);
          }

          let actImageUrl: string | null = act.image_url || null;
          if (!actImageUrl && act.type === 'comment_added' && act.detail) {
            const relatedCmt = db.comments.find(
              (c) => c.content === act.detail && c.author === act.author
            );
            if (relatedCmt) {
              actImageUrl = relatedCmt.image_url || null;
            }
          }
          if (!actImageUrl && act.type === 'deliverable_submitted' && act.detail && isImage(act.detail)) {
            actImageUrl = act.detail;
          }

          activities.push({
            id: act.id,
            type: act.type,
            title: act.title,
            detail: act.detail,
            author: act.author,
            timestamp: act.timestamp,
            image_url: actImageUrl,
            attachments: act.attachments,
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
        const submissionUrl = t.deliverable_submission;
        activities.push({
          id: actId,
          type: 'deliverable_submitted',
          title: `${t.owner} 提交了交付件并完成了「${t.name}」`,
          detail: t.deliverable_submission,
          author: t.owner,
          timestamp: t.deliverable_submitted_at || t.done_at || t.created_at,
          image_url: isImage(submissionUrl) ? submissionUrl : null,
          attachments: t.deliverable_attachments,
        });
      } else {
        activities.push({
          id: `act_done_${t.id}`,
          type: 'task_done',
          title: `${t.owner} 勾选完成了任务「${t.name}」`,
          author: t.owner,
          timestamp: t.done_at || t.created_at,
          attachments: t.deliverable_attachments,
        });
      }
    }
  }

  // 3. 仅对历史未在 activities 中记录的评论做兜底补充
  const projectComments = db.comments.filter(
    (c) => (c.node_id && subtreeIds.has(c.node_id)) || (c.task_id && taskIds.has(c.task_id))
  );
  for (const c of projectComments) {
    const rawContent = (c.content || '').trim();
    if (!rawContent) continue;
    if (rawContent.startsWith('【交付件归档】') || rawContent.startsWith('【排期调整归档】')) {
      continue;
    }

    const commentKey = `${c.author}_${rawContent}`;
    if (seenCommentKeys.has(commentKey)) continue;

    const actId = `act_cmt_${c.id}`;
    if (!seenIds.has(actId) && !activities.some((a) => a.detail === c.content)) {
      seenIds.add(actId);
      seenCommentKeys.add(commentKey);
      let targetName = '相应项';
      let isTask = false;
      if (c.task_id) {
        const task = db.tasks.find((t) => t.id === c.task_id);
        if (task) {
          targetName = task.name;
          isTask = true;
        }
      } else if (c.node_id) {
        const node = db.nodes.find((n) => n.id === c.node_id);
        if (node) {
          targetName = node.name;
        }
      }

      const hasAttachments = !!(c.image_url || (c.attachments && c.attachments.length > 0));
      let title = '';
      if (hasAttachments) {
        title = `${c.author} 记录了「${targetName}」${isTask ? '任务' : ''}的进展备注与证据链`;
      } else {
        title = `${c.author} 记录了「${targetName}」${isTask ? '任务' : ''}的关键业务进展与工作指示`;
      }

      activities.push({
        id: actId,
        type: 'comment_added',
        title,
        detail: c.content,
        author: c.author,
        timestamp: c.created_at,
        image_url: c.image_url || null,
        attachments: c.attachments || [],
      });
    }
  }

  activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return activities.slice(0, limit);
}

function buildNodeTreeRecursively(db: AppDatabase, node: DbNode, todayStr: string): NodeTreeNode {
  const tasks: DbTask[] = db.tasks
    .filter((t) => t.node_id === node.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const childNodes = db.nodes
    .filter((n) => n.parent_id === node.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.created_at.localeCompare(b.created_at));

  const children: NodeTreeNode[] = childNodes.map((child) =>
    buildNodeTreeRecursively(db, child, todayStr)
  );

  let totalTasksCount = tasks.length;
  let completedTasksCount = tasks.filter((t) => t.status === 'done').length;
  let maxOverdueDays = 0;
  let hasDueSoonTasks = false;

  for (const t of tasks) {
    if (t.status === 'pending' && t.due_date) {
      const risk = getDueDateRiskInfo(t.due_date);
      if (risk.isOverdue) {
        const dDue = new Date(t.due_date.slice(0, 10) + 'T00:00:00').getTime();
        const dToday = new Date(todayStr + 'T00:00:00').getTime();
        const diff = Math.floor((dToday - dDue) / (1000 * 60 * 60 * 24));
        if (diff > maxOverdueDays) maxOverdueDays = diff;
      } else if (risk.isDueSoon) {
        hasDueSoonTasks = true;
      }
    }
  }

  let hasOverdueTasks = maxOverdueDays > 0;
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
    if (child.hasDueSoonTasks) hasDueSoonTasks = true;
    if (child.maxOverdueDays && child.maxOverdueDays > maxOverdueDays) {
      maxOverdueDays = child.maxOverdueDays;
    }
    if (!node.due_date && child.latestDueDate) {
      if (!latestDueDate || child.latestDueDate > latestDueDate) {
        latestDueDate = child.latestDueDate;
      }
    }
  }

  if (maxOverdueDays > 0) {
    hasOverdueTasks = true;
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
    hasDueSoonTasks,
    maxOverdueDays,
    latestDueDate,
  };
}
