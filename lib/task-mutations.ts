import { getDb, persistDb } from './db';
import {
  findRootProjectId,
  findRootProjectIdByTask,
  recordActivity,
  describeTaskDiff,
} from './activity-logger';
import { TaskStatus, DeliverableItem } from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function addTask(
  nodeId: string,
  name: string,
  owner: string,
  dueDate?: string | null,
  hasDeliverable?: boolean,
  deliverableRequirement?: string,
  estimatedDuration?: string,
  deliverableItems?: DeliverableItem[]
): Promise<string> {
  const db = getDb();
  const id = generateId('task');
  const now = new Date().toISOString();
  db.tasks.push({
    id,
    node_id: nodeId,
    name,
    owner,
    due_date: dueDate || null,
    estimated_duration: estimatedDuration?.trim() || undefined,
    status: 'pending',
    has_deliverable: !!hasDeliverable,
    deliverable_requirement: hasDeliverable ? deliverableRequirement?.trim() || '需提供交付物验收说明' : undefined,
    deliverable_items: hasDeliverable && deliverableItems && deliverableItems.length > 0 ? deliverableItems : undefined,
    deliverable_submission: null,
    deliverable_submitted_at: null,
    done_at: null,
    created_at: now,
  });

  const rootId = findRootProjectId(db, nodeId);
  const parentNode = db.nodes.find((n) => n.id === nodeId);

  const detailParts = [
    `+ 任务名称: ${name}`,
    `+ 负责人: ${owner}`,
    dueDate ? `+ 计划截止日: ${dueDate}` : `+ 计划截止日: 未设定`,
    estimatedDuration?.trim() ? `+ 预估周期: ${estimatedDuration.trim()}` : null,
    hasDeliverable
      ? `+ 交付件要求: 必须提交成果 (${deliverableRequirement?.trim() || '需提供验收说明'})`
      : `+ 交付件要求: 无交付要求`,
    parentNode ? `+ 所属模块: ${parentNode.name}` : null,
  ].filter(Boolean) as string[];

  recordActivity(db, {
    project_id: rootId,
    node_id: nodeId,
    task_id: id,
    type: 'task_created',
    title: `${owner} 在模块「${parentNode?.name || '项目'}」中新增了任务「${name}」`,
    detail: detailParts.join('\n'),
    author: owner,
  });

  persistDb();
  return id;
}

export async function updateTask(
  taskId: string,
  name: string,
  owner: string,
  dueDate?: string | null,
  hasDeliverable?: boolean,
  deliverableRequirement?: string,
  deliverableSubmission?: string | null,
  doneAt?: string | null,
  status?: TaskStatus,
  estimatedDuration?: string,
  deliverableItems?: DeliverableItem[],
  changeReason?: string
): Promise<void> {
  const db = getDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (task) {
    const { projectId } = findRootProjectIdByTask(db, taskId);
    const changes = describeTaskDiff(task, {
      name,
      owner,
      dueDate: dueDate || null,
      estimatedDuration,
      hasDeliverable,
      deliverableRequirement,
      deliverableSubmission,
      doneAt,
      status,
    });

    let isScheduleChanged = false;
    if (dueDate !== undefined && (task.due_date || null) !== (dueDate || null)) {
      isScheduleChanged = true;
    }
    if (estimatedDuration !== undefined && (task.estimated_duration || '') !== (estimatedDuration?.trim() || '')) {
      isScheduleChanged = true;
    }

    if (isScheduleChanged && changeReason) {
      changes.push(`- 排期调整原因: ${changeReason}`);
    }

    task.name = name;
    task.owner = owner;
    task.due_date = dueDate || null;
    if (estimatedDuration !== undefined) {
      task.estimated_duration = estimatedDuration.trim() || undefined;
    }
    if (hasDeliverable !== undefined) {
      task.has_deliverable = hasDeliverable;
      if (hasDeliverable) {
        task.deliverable_requirement = deliverableRequirement?.trim() || task.deliverable_requirement || '需提供交付物说明';
        if (deliverableItems !== undefined) {
          task.deliverable_items = deliverableItems;
        }
      } else {
        task.deliverable_items = undefined;
      }
    }
    if (deliverableSubmission !== undefined) {
      task.deliverable_submission = deliverableSubmission;
    }
    if (doneAt !== undefined) {
      task.done_at = doneAt ? (doneAt.includes('T') ? doneAt : `${doneAt}T12:00:00.000Z`) : null;
    }
    if (status !== undefined) {
      task.status = status;
      if (status === 'done' && !task.done_at) {
        task.done_at = new Date().toISOString();
      } else if (status === 'pending') {
        task.done_at = null;
      }
    }

    if (changes.length > 0) {
      recordActivity(db, {
        project_id: projectId || findRootProjectId(db, task.node_id),
        node_id: task.node_id,
        task_id: taskId,
        type: 'task_updated',
        title: `${owner} 编辑了任务「${name}」的内容与排期`,
        detail: changes.join('\n'),
        author: owner,
      });

      if (isScheduleChanged && changeReason) {
        const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const schedChanges = changes.filter(c => c.includes('计划截止日') || c.includes('预估周期') || c.includes('完成时间') || c.includes('排期调整原因'));
        db.comments.push({
          id: commentId,
          node_id: task.node_id || null,
          task_id: taskId,
          parent_id: null,
          author: owner,
          content: `【排期调整归档】\n调整理由：${changeReason}\n${schedChanges.join('\n')}`,
          created_at: now,
        });
      }
    }

    persistDb();
  }
}

export async function toggleTaskStatus(
  taskId: string,
  status: TaskStatus,
  deliverableSubmission?: string,
  customDoneAt?: string
): Promise<void> {
  const db = getDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = status;
    const now = customDoneAt
      ? customDoneAt.includes('T')
        ? customDoneAt
        : `${customDoneAt}T12:00:00.000Z`
      : new Date().toISOString();
    const { projectId } = findRootProjectIdByTask(db, taskId);
    const rootId = projectId || findRootProjectId(db, task.node_id);

    if (status === 'done') {
      task.done_at = now;

      // 评估完成时间差异
      let diffTag = '';
      if (task.due_date) {
        const doneDate = now.split('T')[0];
        const dDone = new Date(doneDate + 'T00:00:00').getTime();
        const dDue = new Date(task.due_date + 'T00:00:00').getTime();
        const diffDays = Math.round((dDone - dDue) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) diffTag = ` (提前 ${Math.abs(diffDays)} 天完工)`;
        else if (diffDays === 0) diffTag = ` (按期完工)`;
        else diffTag = ` (延期 ${diffDays} 天完工)`;
      }

      if (task.has_deliverable && deliverableSubmission) {
        task.deliverable_submission = deliverableSubmission.trim();
        task.deliverable_submitted_at = now;

        // 自动将交付件提交作为一条证据链留档
        db.comments.push({
          id: generateId('cmt'),
          node_id: null,
          task_id: task.id,
          parent_id: null,
          author: task.owner || '负责人',
          content: `【交付件归档】${deliverableSubmission.trim()}`,
          created_at: now,
        });

        const diffLines = [
          `- 任务状态: pending (进行中)`,
          `+ 任务状态: done (已完成${diffTag})`,
          `+ 实际完成日: ${now.split('T')[0]}`,
          `+ 交付成果与验收结论: ${deliverableSubmission.trim()}`,
        ];
        recordActivity(db, {
          project_id: rootId,
          node_id: task.node_id,
          task_id: task.id,
          type: 'deliverable_submitted',
          title: `${task.owner} 提交了交付件并完成了「${task.name}」${diffTag}`,
          detail: diffLines.join('\n'),
          author: task.owner,
        });
      } else {
        const diffLines = [
          `- 任务状态: pending (进行中)`,
          `+ 任务状态: done (已完成${diffTag})`,
          `+ 实际完成日: ${now.split('T')[0]}`,
        ];
        recordActivity(db, {
          project_id: rootId,
          node_id: task.node_id,
          task_id: task.id,
          type: 'task_done',
          title: `${task.owner} 勾选完成了任务「${task.name}」${diffTag}`,
          detail: diffLines.join('\n'),
          author: task.owner,
        });
      }
    } else {
      task.done_at = null;
      const diffLines = [
        `- 任务状态: done (已完成)`,
        `+ 任务状态: pending (重置为未完成)`,
        `- 实际完成日: 清除`,
      ];
      recordActivity(db, {
        project_id: rootId,
        node_id: task.node_id,
        task_id: task.id,
        type: 'task_updated',
        title: `${task.owner} 重新将任务「${task.name}」标记为未完成`,
        detail: diffLines.join('\n'),
        author: task.owner,
      });
    }
    persistDb();
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = getDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (task) {
    const { projectId } = findRootProjectIdByTask(db, taskId);
    const detailParts = [
      `- 任务名称: ${task.name}`,
      `- 负责人: ${task.owner}`,
      `- 计划截止日: ${task.due_date}`,
      `- 任务状态: ${task.status === 'done' ? '已完成' : '未完成'}`,
    ];
    recordActivity(db, {
      project_id: projectId || findRootProjectId(db, task.node_id),
      node_id: task.node_id,
      task_id: taskId,
      type: 'task_deleted',
      title: `删除了任务「${task.name}」`,
      detail: detailParts.join('\n'),
      author: task.owner,
    });
  }

  db.comments = db.comments.filter((c) => c.task_id !== taskId);
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  persistDb();
}
