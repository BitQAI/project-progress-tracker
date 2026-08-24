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
  isUnscheduled?: boolean; // 没有明确设置截止日、属于待定/待排期规划项
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
 * 解析工期字符串为天数 (如 "3天", "3-4天", "2周", "5d", "36人天", "10")
 */
export function parseDurationToDays(durationStr?: string | null, defaultDays = 3): number {
  if (!durationStr || typeof durationStr !== 'string') return defaultDays;
  const trimmed = durationStr.trim().toLowerCase();
  
  // 处理范围如 "3-4天", "3~4周", "3至4天" -> 取后界值
  const rangeMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[-~至到/]\s*(\d+(?:\.\d+)?)/);
  let num: number;
  if (rangeMatch) {
    num = parseFloat(rangeMatch[2]) || parseFloat(rangeMatch[1]);
  } else {
    const numMatch = trimmed.match(/\d+(?:\.\d+)?/);
    num = numMatch ? parseFloat(numMatch[0]) : NaN;
  }
  
  if (isNaN(num) || num <= 0) return defaultDays;

  if (trimmed.includes('月') || trimmed.endsWith('m') || trimmed.endsWith('month') || trimmed.endsWith('months')) {
    return Math.max(1, Math.round(num * 30));
  }
  if (trimmed.includes('周') || trimmed.endsWith('w') || trimmed.endsWith('week') || trimmed.endsWith('weeks')) {
    return Math.max(1, Math.round(num * 7));
  }
  
  return Math.max(1, Math.round(num));
}

/**
 * 日期工具：计算两个 YYYY-MM-DD 之间相差天数 (d2 - d1)
 */
export function diffDays(d1Str: string, d2Str: string): number {
  try {
    const p1 = d1Str.split('-').map(Number);
    const p2 = d2Str.split('-').map(Number);
    const utc1 = Date.UTC(p1[0], p1[1] - 1, p1[2]);
    const utc2 = Date.UTC(p2[0], p2[1] - 1, p2[2]);
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * 给指定 YYYY-MM-DD 增加指定天数
 */
export function addDays(dateStr: string, days: number): string {
  try {
    const p = dateStr.split('-').map(Number);
    const utcDate = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    utcDate.setUTCDate(utcDate.getUTCDate() + days);
    const resY = utcDate.getUTCFullYear();
    const resM = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const resD = String(utcDate.getUTCDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
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
  hideUnscheduled = false,
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
    const dueStr = n.due_date ? formatBeijingDate(n.due_date) : null;
    const duration = parseDurationToDays(n.estimated_duration, 7);

    let nodeDue = dueStr || addDays(todayStr, duration - 1);
    let nodeStart = addDays(nodeDue, -(duration - 1));

    const isOverdue = n.hasOverdueTasks || (n.status !== 'done' && dueStr && dueStr < todayStr);
    const overdueDays = isOverdue && dueStr ? Math.max(1, diffDays(dueStr, todayStr)) : 0;

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
      durationDays: Math.max(1, diffDays(nodeStart, nodeDue) + 1),
      progressPercent: n.progressPercent || 0,
      isOverdue: !!isOverdue,
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
    let lastTaskEndDate: string | null = null;

    if (n.tasks && n.tasks.length > 0) {
      for (const t of n.tasks) {
        if (hideCompleted && t.status === 'done') {
          continue;
        }

        const taskDueStr = t.due_date ? formatBeijingDate(t.due_date) : null;
        const isUnscheduled = !taskDueStr;
        if (hideUnscheduled && isUnscheduled) {
          continue;
        }

        const taskDuration = isUnscheduled
          ? parseDurationToDays(t.estimated_duration, 2)
          : Math.max(1, parseDurationToDays(t.estimated_duration, 1));

        // 确定任务起止日期
        let taskDue: string;
        let taskStart: string;

        if (taskDueStr) {
          taskDue = taskDueStr;
          taskStart = addDays(taskDue, -(taskDuration - 1));
        } else {
          // 未排期规划项：放在所属阶段的周期区间内，从阶段起始或上个任务之后开始排列
          const baseStart = lastTaskEndDate ? addDays(lastTaskEndDate, 1) : nodeStart;
          taskStart = baseStart;
          taskDue = addDays(taskStart, taskDuration - 1);
          if (nodeDue && taskDue > nodeDue && diffDays(taskStart, nodeDue) >= 1) {
            taskDue = nodeDue;
          }
        }

        // 待排期任务不计为已逾期
        const isTaskOverdue = !isUnscheduled && t.status !== 'done' && taskDue < todayStr;
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
          durationDays: Math.max(1, diffDays(taskStart, taskDue) + 1),
          progressPercent: t.status === 'done' ? 100 : 0,
          hasDeliverable: t.has_deliverable,
          deliverableSubmitted: !!t.deliverable_submission,
          isOverdue: isTaskOverdue,
          overdueDays: taskOverdueDays,
          isUnscheduled,
          hasChildren: false,
          order: 0,
          originalTask: t,
          dependsOnId: lastTaskId,
        };

        items.push(taskItem);

        // 如果存在前置任务且双方均有排期，建立依赖连线关系
        if (lastTaskId && !isUnscheduled) {
          dependencies.push({
            fromId: lastTaskId,
            toId: t.id,
          });
        }

        if (!isUnscheduled) {
          lastTaskId = t.id;
        }
        lastTaskEndDate = taskDue;
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

  // 4. 计算父节点的起始/截止日期包络 (从后向前回溯，精确聚合子节点与自身的截止日期)
  const itemMap = new Map<string, GanttItem>();
  items.forEach((it) => itemMap.set(it.id, it));

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.type === 'project' || it.type === 'node') {
      const scheduledChildren = items.filter((x) => x.parentId === it.id && !x.isUnscheduled);
      const allChildren = items.filter((x) => x.parentId === it.id);
      const childItems = scheduledChildren.length > 0 ? scheduledChildren : allChildren;

      if (childItems.length > 0) {
        let minStart = childItems[0].startDate;
        let maxDue = childItems[0].dueDate;
        for (const child of childItems) {
          if (child.startDate && child.startDate < minStart) minStart = child.startDate;
          if (child.dueDate && child.dueDate > maxDue) maxDue = child.dueDate;
        }

        const explicitDue = it.originalNode?.due_date ? formatBeijingDate(it.originalNode.due_date) : null;
        it.dueDate = explicitDue && explicitDue > maxDue ? explicitDue : maxDue;

        const duration = parseDurationToDays(it.originalNode?.estimated_duration, 7);
        const estimatedStart = explicitDue ? addDays(it.dueDate, -(duration - 1)) : minStart;
        it.startDate = estimatedStart < minStart ? estimatedStart : minStart;

        it.durationDays = Math.max(1, diffDays(it.startDate, it.dueDate) + 1);
        it.isOverdue = it.status !== 'done' && it.dueDate < todayStr;
        it.overdueDays = it.isOverdue ? Math.max(1, diffDays(it.dueDate, todayStr)) : 0;
      }
    }
  }

  return { items, dependencies };
}

/**
 * 计算甘特图全局时间跨度 (对齐整月以保证月份表头完美对齐)
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

  // 起始月份第 1 天
  const pMin = min.split('-').map(Number);
  const pMax = max.split('-').map(Number);
  const monthFirstDayStr = `${pMin[0]}-${String(pMin[1]).padStart(2, '0')}-01`;

  // 结束月份最后一天 (严格使用 UTC+8 思路避免跨月误差)
  const lastDay = new Date(Date.UTC(pMax[0], pMax[1], 0)).getUTCDate();
  const monthLastDayStr = `${pMax[0]}-${String(pMax[1]).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const paddedMin = monthFirstDayStr;
  const paddedMax = monthLastDayStr;
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
    const p = currentStr.split('-').map(Number);
    const year = p[0];
    const month = p[1];
    const dayNum = p[2];

    const utcDate = new Date(Date.UTC(year, month - 1, dayNum));
    const dayOfWeek = utcDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    list.push({
      dateStr: currentStr,
      dayNumber: dayNum,
      weekDay: weekDays[dayOfWeek],
      isToday: currentStr === todayStr,
      isWeekend,
      monthStr: `${year}年${month}月`,
    });
  }

  return list;
}
