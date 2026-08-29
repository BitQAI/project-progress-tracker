import { DbTask } from './types';

export function parseDurationToDays(durationStr?: string | null): number {
  if (!durationStr || !durationStr.trim()) return 1;
  const s = durationStr.trim().toLowerCase();
  const numMatch = s.match(/([0-9]+(?:\.[0-9]+)?)/);
  const num = numMatch ? parseFloat(numMatch[1]) : 1;
  if (isNaN(num)) return 1;

  if (s.includes('周') || s.includes('week') || s.includes('w')) {
    return num * 5;
  } else if (s.includes('月') || s.includes('month') || s.includes('m')) {
    return num * 20;
  } else if (s.includes('小时') || s.includes('hour') || s.includes('h')) {
    return Math.round((num / 8) * 10) / 10;
  }
  return num;
}

export function calculateProjectEarlyDays(
  tasks: DbTask[],
  projectDueDate?: string | null,
  projectStatus?: string
): number {
  let earlyDaysSum = 0;

  for (const t of tasks) {
    if (t.status === 'done' && t.due_date && t.done_at) {
      const dueDateStr = t.due_date.slice(0, 10);
      const doneAtStr = t.done_at.slice(0, 10);
      if (doneAtStr < dueDateStr) {
        const dDue = new Date(dueDateStr + 'T00:00:00').getTime();
        const dDone = new Date(doneAtStr + 'T00:00:00').getTime();
        const diff = Math.floor((dDue - dDone) / (1000 * 60 * 60 * 24));
        if (diff > 0) {
          earlyDaysSum += diff;
        }
      }
    }
  }

  if (projectStatus === 'done' && projectDueDate) {
    const completedTasksWithDate = tasks.filter((t) => t.status === 'done' && t.done_at);
    if (completedTasksWithDate.length > 0) {
      const latestDoneTimestamp = Math.max(
        ...completedTasksWithDate.map((t) => new Date(t.done_at!.slice(0, 10) + 'T00:00:00').getTime())
      );
      const projectDueTimestamp = new Date(projectDueDate.slice(0, 10) + 'T00:00:00').getTime();
      const projDiff = Math.floor((projectDueTimestamp - latestDoneTimestamp) / (1000 * 60 * 60 * 24));
      if (projDiff > earlyDaysSum) {
        earlyDaysSum = projDiff;
      }
    }
  }

  return earlyDaysSum;
}

export function calculateSpentDuration(
  tasks: DbTask[],
  projectDueDate?: string | null,
  projectStatus?: string
): { spentDays: number; spentTimeDisplay: string; completedEstimatedDays: number } {
  const completedTasks = tasks.filter((t) => t.status === 'done');
  if (completedTasks.length === 0) {
    return { spentDays: 0, spentTimeDisplay: '0天', completedEstimatedDays: 0 };
  }

  let completedEstimatedDays = 0;
  for (const t of completedTasks) {
    completedEstimatedDays += parseDurationToDays(t.estimated_duration);
  }

  const earlyDays = calculateProjectEarlyDays(tasks, projectDueDate, projectStatus);
  const rawSpentDays = completedEstimatedDays - earlyDays;
  const spentDays = Math.max(0, Math.round(rawSpentDays * 10) / 10);

  return {
    spentDays,
    spentTimeDisplay: `${spentDays}天`,
    completedEstimatedDays: Math.round(completedEstimatedDays * 10) / 10,
  };
}

export function calculateMaxOverdueDays(
  tasks: DbTask[],
  projectDueDate: string | null | undefined,
  projectStatus: string | undefined,
  todayStr: string
): number {
  let maxDays = 0;
  for (const t of tasks) {
    if (t.status === 'pending' && t.due_date && t.due_date < todayStr) {
      const dDue = new Date(t.due_date.slice(0, 10) + 'T00:00:00').getTime();
      const dToday = new Date(todayStr + 'T00:00:00').getTime();
      const diff = Math.floor((dToday - dDue) / (1000 * 60 * 60 * 24));
      if (diff > maxDays) maxDays = diff;
    }
  }

  if (projectStatus !== 'done' && projectDueDate && projectDueDate < todayStr) {
    const dDue = new Date(projectDueDate.slice(0, 10) + 'T00:00:00').getTime();
    const dToday = new Date(todayStr + 'T00:00:00').getTime();
    const diff = Math.floor((dToday - dDue) / (1000 * 60 * 60 * 24));
    if (diff > maxDays) maxDays = diff;
  }

  return maxDays;
}

export function calculateEstimatedTimeDisplay(
  nodeEstimatedDuration?: string,
  tasks: DbTask[] = []
): string {
  if (nodeEstimatedDuration && nodeEstimatedDuration.trim()) {
    return nodeEstimatedDuration.trim();
  }

  let totalDays = 0;
  for (const t of tasks) {
    if (t.estimated_duration && t.estimated_duration.trim()) {
      const s = t.estimated_duration.trim().toLowerCase();
      const numMatch = s.match(/([0-9]+(?:\.[0-9]+)?)/);
      const num = numMatch ? parseFloat(numMatch[1]) : null;
      if (num !== null && !isNaN(num)) {
        if (s.includes('周') || s.includes('week') || s.includes('w')) {
          totalDays += num * 5;
        } else if (s.includes('月') || s.includes('month') || s.includes('m')) {
          totalDays += num * 20;
        } else if (s.includes('小时') || s.includes('hour') || s.includes('h')) {
          totalDays += num / 8;
        } else {
          totalDays += num;
        }
      }
    } else {
      totalDays += 2;
    }
  }

  if (totalDays > 0) {
    const rounded = Math.round(totalDays * 10) / 10;
    return `${rounded}天`;
  }
  return '未设定';
}

export function calculateCompletedDuration(tasks: DbTask[]): string {
  const completedTasks = tasks.filter((t) => t.status === 'done');
  if (completedTasks.length === 0) return '0天';

  let totalDays = 0;
  for (const t of completedTasks) {
    if (t.estimated_duration && t.estimated_duration.trim()) {
      const s = t.estimated_duration.trim().toLowerCase();
      const numMatch = s.match(/([0-9]+(?:\.[0-9]+)?)/);
      const num = numMatch ? parseFloat(numMatch[1]) : null;

      if (num !== null && !isNaN(num)) {
        if (s.includes('周') || s.includes('week') || s.includes('w')) {
          totalDays += num * 5;
        } else if (s.includes('月') || s.includes('month') || s.includes('m')) {
          totalDays += num * 20;
        } else if (s.includes('小时') || s.includes('hour') || s.includes('h')) {
          totalDays += num / 8;
        } else {
          totalDays += num;
        }
      }
    } else {
      totalDays += 1;
    }
  }

  if (totalDays === 0) return '0天';
  const rounded = Math.round(totalDays * 10) / 10;
  return `${rounded}天`;
}
