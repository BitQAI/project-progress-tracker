import { AppDatabase } from './db';
import { DbActivityLog, DbNode, DbTask } from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function findRootProjectId(db: AppDatabase, nodeId: string): string {
  let curr = db.nodes.find((n) => n.id === nodeId);
  while (curr && curr.parent_id) {
    const parent = db.nodes.find((n) => n.id === curr!.parent_id);
    if (!parent) break;
    curr = parent;
  }
  return curr ? curr.id : nodeId;
}

export function findRootProjectIdByTask(db: AppDatabase, taskId: string): { projectId: string; task?: DbTask; node?: DbNode } {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return { projectId: '' };
  const node = db.nodes.find((n) => n.id === task.node_id);
  const projectId = node ? findRootProjectId(db, node.id) : '';
  return { projectId, task, node };
}

export function recordActivity(
  db: AppDatabase,
  activity: Omit<DbActivityLog, 'id' | 'timestamp'>
): DbActivityLog {
  if (!db.activities) {
    db.activities = [];
  }
  const log: DbActivityLog = {
    id: generateId('act'),
    timestamp: new Date().toISOString(),
    ...activity,
  };
  db.activities.unshift(log);
  return log;
}

export function describeTaskDiff(
  oldTask: DbTask,
  newProps: {
    name: string;
    owner: string;
    dueDate?: string | null;
    estimatedDuration?: string;
    hasDeliverable?: boolean;
    deliverableRequirement?: string;
    deliverableSubmission?: string | null;
    doneAt?: string | null;
    status?: 'pending' | 'done';
  }
): string[] {
  const changes: string[] = [];

  if (oldTask.name !== newProps.name) {
    changes.push(`- 任务名称: ${oldTask.name}`);
    changes.push(`+ 任务名称: ${newProps.name}`);
  }
  if (oldTask.owner !== newProps.owner) {
    changes.push(`- 负责人: ${oldTask.owner}`);
    changes.push(`+ 负责人: ${newProps.owner}`);
  }
  const oldDueDate = oldTask.due_date || '';
  const newDueDate = newProps.dueDate || '';
  if (oldDueDate !== newDueDate) {
    changes.push(`- 计划截止日: ${oldTask.due_date || '未排期'}`);
    changes.push(`+ 计划截止日: ${newProps.dueDate || '未排期'}`);
  }
  if (newProps.estimatedDuration !== undefined && (oldTask.estimated_duration || '') !== (newProps.estimatedDuration || '')) {
    changes.push(`- 预估周期: ${oldTask.estimated_duration || '未设置'}`);
    changes.push(`+ 预估周期: ${newProps.estimatedDuration || '未设置'}`);
  }
  if (newProps.status && oldTask.status !== newProps.status) {
    changes.push(`- 任务状态: ${oldTask.status === 'done' ? '已完成' : '未完成'}`);
    changes.push(`+ 任务状态: ${newProps.status === 'done' ? '已完成' : '未完成'}`);
  }
  if (newProps.doneAt !== undefined && oldTask.done_at !== newProps.doneAt) {
    const oldDoneStr = oldTask.done_at ? oldTask.done_at.split('T')[0] : '未完成';
    const newDoneStr = newProps.doneAt ? newProps.doneAt.split('T')[0] : '未完成';
    changes.push(`- 实际完成日: ${oldDoneStr}`);
    changes.push(`+ 实际完成日: ${newDoneStr}`);
  }
  if (newProps.hasDeliverable !== undefined && oldTask.has_deliverable !== newProps.hasDeliverable) {
    changes.push(`- 交付件要求: ${oldTask.has_deliverable ? '必须提交交付成果' : '无交付要求'}`);
    changes.push(`+ 交付件要求: ${newProps.hasDeliverable ? '必须提交交付成果' : '无交付要求'}`);
  }
  if (
    newProps.hasDeliverable &&
    newProps.deliverableRequirement &&
    oldTask.deliverable_requirement !== newProps.deliverableRequirement
  ) {
    changes.push(`- 交付要求规范: ${oldTask.deliverable_requirement || '无'}`);
    changes.push(`+ 交付要求规范: ${newProps.deliverableRequirement}`);
  }
  if (
    newProps.deliverableSubmission !== undefined &&
    oldTask.deliverable_submission !== newProps.deliverableSubmission
  ) {
    changes.push(`- 交付成果: ${oldTask.deliverable_submission || '（无）'}`);
    changes.push(`+ 交付成果: ${newProps.deliverableSubmission || '（已清除）'}`);
  }

  return changes;
}

export function describeNodeDiff(
  oldNode: DbNode,
  newProps: {
    name: string;
    owner: string;
    description?: string;
    estimatedDuration?: string;
  }
): string[] {
  const changes: string[] = [];

  if (oldNode.name !== newProps.name) {
    changes.push(`- 模块名称: ${oldNode.name}`);
    changes.push(`+ 模块名称: ${newProps.name}`);
  }
  if (oldNode.owner !== newProps.owner) {
    changes.push(`- 负责人: ${oldNode.owner}`);
    changes.push(`+ 负责人: ${newProps.owner}`);
  }
  const oldDesc = oldNode.description?.trim() || '';
  const newDesc = newProps.description?.trim() || '';
  if (oldDesc !== newDesc) {
    changes.push(`- 模块说明: ${oldDesc || '（无）'}`);
    changes.push(`+ 模块说明: ${newDesc || '（无）'}`);
  }
  const oldDur = oldNode.estimated_duration?.trim() || '';
  const newDur = newProps.estimatedDuration?.trim() || '';
  if (oldDur !== newDur) {
    changes.push(`- 预估周期: ${oldDur || '未设定'}`);
    changes.push(`+ 预估周期: ${newDur || '未设定'}`);
  }

  return changes;
}
