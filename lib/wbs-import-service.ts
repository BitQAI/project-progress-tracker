import { getDb, persistDb } from './db';
import { findRootProjectId, recordActivity } from './activity-logger';
import { BatchImportPayload } from './ai-wbs-types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function batchImportWbsDraft(payload: BatchImportPayload): Promise<{
  insertedNodesCount: number;
  insertedTasksCount: number;
}> {
  const db = getDb();
  const now = new Date().toISOString();
  const { projectId, targetLevel, targetNodeId, targetTaskId, author, nodes = [], tasks = [] } = payload;
  const rootId = findRootProjectId(db, targetNodeId || projectId);

  let insertedNodesCount = 0;
  let insertedTasksCount = 0;
  const detailLogs: string[] = [];

  if (targetLevel === 'project_subnodes') {
    const parentId = targetNodeId || projectId;
    const parentNode = db.nodes.find((n) => n.id === parentId);

    for (const nodeItem of nodes) {
      if (!nodeItem.name?.trim()) continue;
      const nodeId = generateId('node');
      const siblingCount = db.nodes.filter((n) => n.parent_id === parentId).length;

      db.nodes.push({
        id: nodeId,
        parent_id: parentId,
        name: nodeItem.name.trim(),
        owner: nodeItem.owner?.trim() || author || '负责人',
        estimated_duration: nodeItem.estimatedDuration?.trim() || undefined,
        due_date: nodeItem.dueDate?.trim() || null,
        description: nodeItem.description?.trim() || undefined,
        order: siblingCount + 1,
        status: 'in_progress',
        created_at: now,
      });
      insertedNodesCount++;
      detailLogs.push(`+ 新增分组/模块:「${nodeItem.name.trim()}」(负责人: ${nodeItem.owner})`);

      // 导入该模块下的初始任务
      if (nodeItem.tasks && nodeItem.tasks.length > 0) {
        for (const taskItem of nodeItem.tasks) {
          if (!taskItem.name?.trim()) continue;
          const taskId = generateId('task');
          db.tasks.push({
            id: taskId,
            node_id: nodeId,
            parent_id: null,
            name: taskItem.name.trim(),
            owner: taskItem.owner?.trim() || nodeItem.owner?.trim() || author || '负责人',
            due_date: taskItem.dueDate?.trim() || null,
            estimated_duration: taskItem.estimatedDuration?.trim() || undefined,
            status: 'pending',
            has_deliverable: !!taskItem.hasDeliverable,
            deliverable_requirement: taskItem.hasDeliverable
              ? taskItem.deliverableRequirement?.trim() || '需提供交付物验收说明'
              : undefined,
            deliverable_submission: null,
            deliverable_submitted_at: null,
            done_at: null,
            created_at: now,
          });
          insertedTasksCount++;
          detailLogs.push(`  ↳ 新增模块任务:「${taskItem.name.trim()}」`);
        }
      }
    }

    recordActivity(db, {
      project_id: rootId,
      node_id: parentId,
      type: 'node_created',
      title: `${author} 通过 AI 智能解析批量导入了 ${insertedNodesCount} 个分组与 ${insertedTasksCount} 项任务`,
      detail: detailLogs.join('\n'),
      author,
    });
  } else if (targetLevel === 'node_tasks') {
    const nodeId = targetNodeId || projectId;
    const targetNode = db.nodes.find((n) => n.id === nodeId);

    for (const taskItem of tasks) {
      if (!taskItem.name?.trim()) continue;
      const taskId = generateId('task');
      db.tasks.push({
        id: taskId,
        node_id: nodeId,
        parent_id: null,
        name: taskItem.name.trim(),
        owner: taskItem.owner?.trim() || author || '负责人',
        due_date: taskItem.dueDate?.trim() || null,
        estimated_duration: taskItem.estimatedDuration?.trim() || undefined,
        status: 'pending',
        has_deliverable: !!taskItem.hasDeliverable,
        deliverable_requirement: taskItem.hasDeliverable
          ? taskItem.deliverableRequirement?.trim() || '需提供交付物验收说明'
          : undefined,
        deliverable_submission: null,
        deliverable_submitted_at: null,
        done_at: null,
        created_at: now,
      });
      insertedTasksCount++;
      detailLogs.push(`+ 新增任务:「${taskItem.name.trim()}」(负责人: ${taskItem.owner})`);
    }

    recordActivity(db, {
      project_id: rootId,
      node_id: nodeId,
      type: 'task_created',
      title: `${author} 在「${targetNode?.name || '模块'}」通过 AI 智能解析批量新增了 ${insertedTasksCount} 项任务`,
      detail: detailLogs.join('\n'),
      author,
    });
  } else if (targetLevel === 'task_subtasks') {
    const parentTask = db.tasks.find((t) => t.id === targetTaskId);
    const nodeId = targetNodeId || (parentTask ? parentTask.node_id : projectId);

    for (const taskItem of tasks) {
      if (!taskItem.name?.trim()) continue;
      const taskId = generateId('task');
      db.tasks.push({
        id: taskId,
        node_id: nodeId,
        parent_id: targetTaskId || null,
        name: taskItem.name.trim(),
        owner: taskItem.owner?.trim() || (parentTask ? parentTask.owner : author) || '负责人',
        due_date: taskItem.dueDate?.trim() || null,
        estimated_duration: taskItem.estimatedDuration?.trim() || undefined,
        status: 'pending',
        has_deliverable: !!taskItem.hasDeliverable,
        deliverable_requirement: taskItem.hasDeliverable
          ? taskItem.deliverableRequirement?.trim() || '需提供交付物验收说明'
          : undefined,
        deliverable_submission: null,
        deliverable_submitted_at: null,
        done_at: null,
        created_at: now,
      });
      insertedTasksCount++;
      detailLogs.push(`+ 新增子任务:「${taskItem.name.trim()}」(所属父任务: ${parentTask?.name || ''})`);
    }

    recordActivity(db, {
      project_id: rootId,
      node_id: nodeId,
      task_id: targetTaskId || undefined,
      type: 'task_created',
      title: `${author} 在任务「${parentTask?.name || ''}」下通过 AI 智能拆解新增了 ${insertedTasksCount} 项子任务`,
      detail: detailLogs.join('\n'),
      author,
    });
  }

  await persistDb();
  return { insertedNodesCount, insertedTasksCount };
}
