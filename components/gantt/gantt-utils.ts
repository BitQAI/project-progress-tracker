import { NodeTreeNode, DbTask, ProjectStatus, TaskStatus, ProjectPriority } from '@/lib/types';
import { getTodayBeijingString, formatBeijingDate } from '@/lib/date-utils';

export type GanttViewMode = 'day' | 'week' | 'month';

export interface GanttItem {
  id: string;
  type: 'project' | 'node' | 'task';
  parentId: string | null;
  name: string;
  owner: string;
  status: ProjectStatus | TaskStatus;
  priority?: ProjectPriority;
  depth: number;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  doneAt?: string | null;
  durationDays: number;
  progressPercent: number;
  hasDeliverable?: boolean;
  deliverableSubmitted?: boolean;
  isOverdue: boolean;
  overdueDays: number;
  hasChildren: boolean;
  order: number;
  originalNode?: NodeTreeNode;
  originalTask?: DbTask;
  dependsOnId?: string | null;
}

export interface GanttDependency {
  fromId: string;
  toId: string;
}

/**
 * 解析工期字符串为天数 (如 "3天", "2周", "5d", "10")
 */
export function parseDurationToDays(durationStr?: string | null, defaultDays = 3): number {
  if (!durationStr || typeof durationStr !== 'string') return defaultDays;
  const trimmed = durationStr.trim().toLowerCase();
  
  if (trimmed.includes('周') || trimmed.endsWith('w') || trimmed.endsWith('week') || trimmed.endsWith('weeks')) {
    const num = parseFloat(trimmed.replace(/[^0-9.]/g, ''));
    return isNaN(num) || num <= 0 ? defaultDays : Math.max(1, Math.round(num * 7));
  }
  if (trimmed.includes('月') || trimmed.endsWith('m') || trimmed.endsWith('month') || trimmed.endsWith('months')) {
    const num = parseFloat(trimmed.replace(/[^0-9.]/g, ''));
    return isNaN(num) || num <= 0 ? defaultDays : Math.max(1, Math.round(num * 30));
  }
  
  const num = parseFloat(trimmed.replace(/[^0-9.]/g, ''));
  return isNaN(num) || num <= 0 ? defaultDays : Math.max(1, Math.round(num));
}

/**
 * 日期工具：计算两个 YYYY-MM-DD 之间相差天数 (d2 - d1)
 */
export function diffDays(d1Str: string, d2Str: string): number {
  try {
    const d1 = new Date(`${d1Str}T00:00:00`);
    const d2 = new Date(`${d2Str}T00:00:00`);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * 给指定 YYYY-MM-DD 增加指定天数
 */
export function addDays(dateStr: string, days: number): string {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return formatBeijingDate(d);
  } catch {
    return dateStr;
  }
}

/**
 * 递归扁平化项目树为甘特图项列表
 */
export function flattenTreeToGanttItems(
  node: NodeTreeNode,
  collapsedIds: Set<string>,
  hideCompleted = false,
  depth = 0,
  prevSiblingEndMap: Map<string, string> = new Map()
): { items: GanttItem[]; dependencies: GanttDependency[] } {
  const items: GanttItem[] = [];
  const dependencies: GanttDependency[] = [];
  const todayStr = getTodayBeijingString();

  function processNode(n: NodeTreeNode, currentDepth: number, parentId: string | null) {
    const isProject = currentDepth === 0;
    const hasChildren = (n.children && n.children.length > 0) || (n.tasks && n.tasks.length > 0);

    // 1. 估算该节点的起始与截止日期
    const createdStr = formatBeijingDate(n.created_at) || todayStr;
    const dueStr = n.due_date ? formatBeijingDate(n.due_date) : null;
    const duration = parseDurationToDays(n.estimated_duration, 7);

    let nodeStart = createdStr;
    let nodeDue = dueStr || addDays(nodeStart, duration);
    if (diffDays(nodeStart, nodeDue) < 1) {
      nodeDue = addDays(nodeStart, 1);
    }

    const isOverdue = n.hasOverdueTasks || (n.status !== 'done' && nodeDue < todayStr);
    const overdueDays = isOverdue ? Math.max(1, diffDays(nodeDue, todayStr)) : 0;

    const nodeGanttItem: GanttItem = {
      id: n.id,
      type: isProject ? 'project' : 'node',
      parentId,
      name: n.name,
      owner: n.owner,
      status: n.status,
      priority: n.priority,
      depth: currentDepth,
      startDate: nodeStart,
      dueDate: nodeDue,
      durationDays: Math.max(1, diffDays(nodeStart, nodeDue)),
      progressPercent: n.progressPercent || 0,
      isOverdue,
      overdueDays,
      hasChildren,
      order: n.order ?? 0,
      originalNode: n,
    };

    items.push(nodeGanttItem);

    // 如果当前节点被折叠，不展开其子节点与任务
    if (collapsedIds.has(n.id)) {
      return;
    }

    // 2. 处理子任务 (Tasks)
    let lastTaskId: string | null = null;
    let prevTaskDue: string = nodeStart;

    if (n.tasks && n.tasks.length > 0) {
      for (const t of n.tasks) {
        if (hideCompleted && t.status === 'done') {
          continue;
        }

        const taskCreated = formatBeijingDate(t.created_at) || nodeStart;
        const taskDue = t.due_date ? formatBeijingDate(t.due_date) : addDays(prevTaskDue, parseDurationToDays(t.estimated_duration, 3));
        const taskDuration = Math.max(1, parseDurationToDays(t.estimated_duration, Math.max(1, diffDays(taskCreated, taskDue))));
        
        let taskStart = addDays(taskDue, -taskDuration);
        if (taskStart < taskCreated) taskStart = taskCreated;
        if (diffDays(taskStart, taskDue) < 1) {
          taskStart = addDays(taskDue, -1);
        }

        const isTaskOverdue = t.status !== 'done' && taskDue < todayStr;
        const taskOverdueDays = isTaskOverdue ? Math.max(1, diffDays(taskDue, todayStr)) : 0;

        const taskItem: GanttItem = {
          id: t.id,
          type: 'task',
          parentId: n.id,
          name: t.name,
          owner: t.owner,
          status: t.status,
          depth: currentDepth + 1,
          startDate: taskStart,
          dueDate: taskDue,
          doneAt: t.done_at,
          durationDays: Math.max(1, diffDays(taskStart, taskDue)),
          progressPercent: t.status === 'done' ? 100 : 0,
          hasDeliverable: t.has_deliverable,
          deliverableSubmitted: !!t.deliverable_submission,
          isOverdue: isTaskOverdue,
          overdueDays: taskOverdueDays,
          hasChildren: false,
          order: 0,
          originalTask: t,
          dependsOnId: lastTaskId,
        };

        items.push(taskItem);

        // 如果存在前置任务，建立依赖连线关系
        if (lastTaskId) {
          dependencies.push({
            fromId: lastTaskId,
            toId: t.id,
          });
        }

        lastTaskId = t.id;
        prevTaskDue = taskDue;
      }
    }

    // 3. 处理子节点 (Sub-nodes)
    let lastChildNodeId: string | null = null;
    if (n.children && n.children.length > 0) {
      for (const child of n.children) {
        processNode(child, currentDepth + 1, n.id);
        if (lastChildNodeId) {
          dependencies.push({
            fromId: lastChildNodeId,
            toId: child.id,
          });
        }
        lastChildNodeId = child.id;
      }
    }
  }

  processNode(node, depth, null);

  // 4. 计算父节点的起始/截止日期包络 (聚合真实起止区间)
  const itemMap = new Map<string, GanttItem>();
  items.forEach((it) => itemMap.set(it.id, it));

  // 从后向前回溯聚合
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.parentId && itemMap.has(it.parentId)) {
      const parent = itemMap.get(it.parentId)!;
      if (!parent.startDate || it.startDate < parent.startDate) {
        parent.startDate = it.startDate;
      }
      if (!parent.dueDate || it.dueDate > parent.dueDate) {
        parent.dueDate = it.dueDate;
      }
      parent.durationDays = Math.max(1, diffDays(parent.startDate, parent.dueDate));
    }
  }

  return { items, dependencies };
}

/**
 * 计算甘特图全局时间跨度 (包含前后 padding 缓冲期)
 */
export function getGanttTimelineRange(items: GanttItem[]): {
  minDate: string;
  maxDate: string;
  totalDays: number;
} {
  const today = getTodayBeijingString();
  let min = today;
  let max = today;

  if (items.length > 0) {
    min = items[0].startDate || today;
    max = items[0].dueDate || today;

    for (const item of items) {
      if (item.startDate && item.startDate < min) min = item.startDate;
      if (item.dueDate && item.dueDate > max) max = item.dueDate;
    }
  }

  // 前后各扩展 3 ~ 5 天缓冲
  const paddedMin = addDays(min, -3);
  const paddedMax = addDays(max, 5);
  const totalDays = Math.max(14, diffDays(paddedMin, paddedMax) + 1);

  return {
    minDate: paddedMin,
    maxDate: paddedMax,
    totalDays,
  };
}

/**
 * 生成时间轴的每日刻度列表
 */
export function generateTimelineDays(minDate: string, totalDays: number): {
  dateStr: string;
  dayNumber: number;
  weekDay: string;
  isToday: boolean;
  isWeekend: boolean;
  monthStr: string;
}[] {
  const todayStr = getTodayBeijingString();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const list = [];

  for (let i = 0; i < totalDays; i++) {
    const currentStr = addDays(minDate, i);
    const d = new Date(`${currentStr}T00:00:00`);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    list.push({
      dateStr: currentStr,
      dayNumber: d.getDate(),
      weekDay: weekDays[dayOfWeek],
      isToday: currentStr === todayStr,
      isWeekend,
      monthStr: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    });
  }

  return list;
}
