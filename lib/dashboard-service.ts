import { getDb, AppDatabase } from './db';
import {
  DbNode,
  DbTask,
  ProjectSummary,
  DashboardMetrics,
  DashboardRiskItem,
  ExecutiveActivityItem,
} from './types';
import { getTodayBeijingString, getDueDateRiskInfo } from './date-utils';
import { getAllExecutiveActivitiesList } from './executive-activity-service';
import {
  calculateSpentDuration,
  calculateMaxOverdueDays,
  calculateProjectEarlyDays,
  calculateEstimatedTimeDisplay,
  calculateCompletedDuration,
} from './project-calc-utils';

export interface DashboardDataResult {
  summaries: ProjectSummary[];
  metrics: DashboardMetrics;
  executiveActivities: ExecutiveActivityItem[];
  allActivities: ExecutiveActivityItem[];
}

const statusWeight = (s: string): number => {
  if (s === 'in_progress') return 1;
  if (s === 'suspended') return 2;
  if (s === 'unstarted') return 3;
  if (s === 'done') return 4;
  return 5;
};

const priorityWeight = (p?: string): number => {
  if (p === 'P0') return 1;
  if (p === 'P1') return 2;
  if (p === 'P2') return 3;
  if (p === 'P3') return 4;
  return 2;
};

/**
 * 单趟高性能计算仪表盘全量数据，毫秒级响应
 */
export async function getDashboardData(): Promise<DashboardDataResult> {
  const db: AppDatabase = getDb();
  const todayStr = getTodayBeijingString();

  // 1. 构建快速索引 Map，避免 O(N^2) 嵌套过滤
  const tasksByNodeId = new Map<string, DbTask[]>();
  for (const t of db.tasks || []) {
    let list = tasksByNodeId.get(t.node_id);
    if (!list) {
      list = [];
      tasksByNodeId.set(t.node_id, list);
    }
    list.push(t);
  }

  const childrenByParentId = new Map<string, DbNode[]>();
  const allNodesMap = new Map<string, DbNode>();
  for (const n of db.nodes || []) {
    allNodesMap.set(n.id, n);
    if (n.parent_id) {
      let list = childrenByParentId.get(n.parent_id);
      if (!list) {
        list = [];
        childrenByParentId.set(n.parent_id, list);
      }
      list.push(n);
    }
  }

  const getSubtreeNodeIds = (rootId: string): string[] => {
    const ids: string[] = [rootId];
    const queue = [rootId];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      const children = childrenByParentId.get(cur);
      if (children) {
        for (const c of children) {
          ids.push(c.id);
          queue.push(c.id);
        }
      }
    }
    return ids;
  };

  // 2. 筛选并排序根节点项目
  const rootNodes = (db.nodes || [])
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

  // 3. 构建最近活动索引 (按项目聚合最新一条)
  const latestActivityByProjId = new Map<string, string>();
  if (Array.isArray(db.activities) && db.activities.length > 0) {
    for (const act of db.activities) {
      const pId = act.project_id || (act.node_id ? allNodesMap.get(act.node_id)?.parent_id || act.node_id : '');
      if (pId && !latestActivityByProjId.has(pId) && act.title) {
        latestActivityByProjId.set(pId, act.title);
      }
    }
  }

  const summaries: ProjectSummary[] = [];
  const riskItems: DashboardRiskItem[] = [];

  let inProgressCount = 0;
  let doneCount = 0;
  let unstartedCount = 0;
  let suspendedCount = 0;
  let overdueProjectsCount = 0;
  let dueSoonProjectsCount = 0;
  let riskProjectsCount = 0;
  let riskTasksCount = 0;
  let totalTasksCount = 0;
  let completedTasksCount = 0;
  let totalEarlyDays = 0;

  // 4. 单次遍历项目根节点，同时产出 summaries 和 metrics
  for (const node of rootNodes) {
    const subtreeIds = getSubtreeNodeIds(node.id);
    const subtreeIdSet = new Set(subtreeIds);

    const tasks: DbTask[] = [];
    for (const sId of subtreeIds) {
      const nTasks = tasksByNodeId.get(sId);
      if (nTasks) {
        tasks.push(...nTasks);
      }
    }

    let completedTasks = 0;
    let overdueTasksCount = 0;
    let dueSoonTasksCount = 0;
    let latestDueDate: string | null = node.due_date || null;

    // 统计各任务状态与风险
    for (const t of tasks) {
      if (t.status === 'done') {
        completedTasks++;
      } else if (t.due_date) {
        const risk = getDueDateRiskInfo(t.due_date);
        if (risk.isOverdue) {
          overdueTasksCount++;
          const parentNode = allNodesMap.get(t.node_id);
          riskItems.push({
            id: `risk_task_${t.id}`,
            kind: 'task',
            riskType: 'overdue',
            riskLabel: risk.label,
            projectId: node.id,
            projectName: node.name,
            nodeId: t.node_id,
            nodeName: parentNode?.name || '模块分组',
            taskId: t.id,
            taskName: t.name,
            owner: t.owner,
            dueDate: t.due_date,
            diffDays: risk.diffDays,
          });
        } else if (risk.isDueSoon) {
          dueSoonTasksCount++;
          const parentNode = allNodesMap.get(t.node_id);
          riskItems.push({
            id: `risk_task_${t.id}`,
            kind: 'task',
            riskType: 'due_soon',
            riskLabel: risk.label,
            projectId: node.id,
            projectName: node.name,
            nodeId: t.node_id,
            nodeName: parentNode?.name || '模块分组',
            taskId: t.id,
            taskName: t.name,
            owner: t.owner,
            dueDate: t.due_date,
            diffDays: risk.diffDays,
          });
        }
      }

      if (!node.due_date && t.due_date) {
        if (!latestDueDate || t.due_date > latestDueDate) {
          latestDueDate = t.due_date;
        }
      }
    }

    // 检查根项目节点的风险
    if (node.status !== 'done' && node.due_date) {
      const pRisk = getDueDateRiskInfo(node.due_date);
      if (pRisk.isOverdue || pRisk.isDueSoon) {
        riskItems.push({
          id: `risk_proj_${node.id}`,
          kind: 'project',
          riskType: pRisk.isOverdue ? 'overdue' : 'due_soon',
          riskLabel: pRisk.label,
          projectId: node.id,
          projectName: node.name,
          owner: node.owner,
          dueDate: node.due_date,
          diffDays: pRisk.diffDays,
        });
      }
    }

    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const earlyDays = calculateProjectEarlyDays(tasks, node.due_date, node.status);
    const estimatedTimeDisplay = calculateEstimatedTimeDisplay(node.estimated_duration, tasks);
    const spentInfo = calculateSpentDuration(tasks, node.due_date, node.status);
    const maxOverdueDays = calculateMaxOverdueDays(tasks, node.due_date, node.status, todayStr);

    const projectRisk = getDueDateRiskInfo(node.due_date);
    const isProjectNodeOverdue = node.status !== 'done' && projectRisk.isOverdue;
    const isProjectNodeDueSoon = node.status !== 'done' && projectRisk.isDueSoon;

    const isOverdue = maxOverdueDays > 0 || overdueTasksCount > 0 || isProjectNodeOverdue;
    const isDueSoon = dueSoonTasksCount > 0 || isProjectNodeDueSoon;
    const hasRisk = isOverdue || isDueSoon;

    const latestAct = latestActivityByProjId.get(node.id);

    const summary: ProjectSummary = {
      id: node.id,
      name: node.name,
      owner: node.owner,
      status: node.status,
      priority: node.priority || 'P1',
      description: node.description,
      estimated_duration: node.estimated_duration,
      completedDuration: calculateCompletedDuration(tasks),
      estimatedTimeDisplay,
      spentDays: spentInfo.spentDays,
      spentTimeDisplay: spentInfo.spentTimeDisplay,
      earlyDays,
      created_at: node.created_at,
      totalTasks,
      completedTasks,
      progress,
      latestDueDate,
      isOverdue,
      isDueSoon,
      hasRisk,
      overdueTasksCount,
      dueSoonTasksCount,
      maxOverdueDays,
      nodesCount: subtreeIdSet.size,
      latestActivity: latestAct,
    };

    summaries.push(summary);

    // 累加仪表盘指标
    if (node.status === 'in_progress') inProgressCount++;
    else if (node.status === 'done') doneCount++;
    else if (node.status === 'unstarted') unstartedCount++;
    else if (node.status === 'suspended') suspendedCount++;

    if (earlyDays > 0) totalEarlyDays += earlyDays;
    if (isOverdue) overdueProjectsCount++;
    if (isDueSoon) dueSoonProjectsCount++;
    if (hasRisk) riskProjectsCount++;

    riskTasksCount += overdueTasksCount + dueSoonTasksCount;
    totalTasksCount += totalTasks;
    completedTasksCount += completedTasks;
  }

  // 5. 排序风险事项
  riskItems.sort((a, b) => a.diffDays - b.diffDays || a.projectName.localeCompare(b.projectName));

  const totalProjects = summaries.length;
  const activeProjectsCount = inProgressCount + doneCount;
  const averageProgress =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const metrics: DashboardMetrics = {
    totalProjects,
    averageProgress,
    activeProjectsCount,
    inProgressCount,
    doneCount,
    unstartedCount,
    suspendedCount,
    overdueProjectsCount,
    dueSoonProjectsCount,
    riskProjectsCount,
    riskTasksCount,
    riskItems,
    totalTasksCount,
    completedTasksCount,
    totalEarlyDays,
  };

  // 6. 全局动态一次性计算并切片
  const allActs = getAllExecutiveActivitiesList();
  const executiveActivities = allActs.slice(0, 3);
  const initialActivities = allActs.slice(0, 10);

  return {
    summaries,
    metrics,
    executiveActivities,
    allActivities: initialActivities,
  };
}
