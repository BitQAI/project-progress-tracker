import { getDb, persistDb } from './db';
import { getSubtreeNodeIds } from './project-service';
import {
  findRootProjectId,
  recordActivity,
  describeNodeDiff,
} from './activity-logger';
import {
  ProjectStatus,
  ProjectPriority,
} from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function createProjectFromScratch(
  name: string,
  owner: string,
  description?: string,
  estimatedDuration?: string,
  priority: ProjectPriority = 'P1'
): Promise<string> {
  const db = getDb();
  const id = generateId('proj');
  const now = new Date().toISOString();
  db.nodes.push({
    id,
    parent_id: null,
    name,
    owner,
    description: description?.trim() || undefined,
    estimated_duration: estimatedDuration?.trim() || undefined,
    order: db.nodes.filter((n) => n.parent_id === null).length + 1,
    status: 'in_progress',
    priority: priority || 'P1',
    created_at: now,
  });

  const detailParts: string[] = [];
  detailParts.push(`+ 项目名称: ${name}`);
  detailParts.push(`+ 项目负责人: ${owner}`);
  detailParts.push(`+ 优先级: ${priority || 'P1'}`);
  if (estimatedDuration?.trim()) detailParts.push(`+ 预估周期: ${estimatedDuration.trim()}`);
  if (description?.trim()) detailParts.push(`+ 项目背景: ${description.trim()}`);

  recordActivity(db, {
    project_id: id,
    node_id: id,
    type: 'project_created',
    title: `${owner} 创建了项目「${name}」[优先级: ${priority || 'P1'}]`,
    detail: detailParts.join('\n'),
    author: owner,
  });

  persistDb();
  return id;
}

export async function createProjectFromTemplate(
  name: string,
  owner: string,
  templateId: string,
  description?: string,
  estimatedDuration?: string,
  priority: ProjectPriority = 'P1'
): Promise<string> {
  const db = getDb();
  const rootId = generateId('proj');
  const now = new Date().toISOString();
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

  db.nodes.push({
    id: rootId,
    parent_id: null,
    name,
    owner,
    description: description?.trim() || undefined,
    estimated_duration: estimatedDuration?.trim() || undefined,
    order: db.nodes.filter((n) => n.parent_id === null).length + 1,
    status: 'in_progress',
    priority: priority || 'P1',
    created_at: now,
  });

  const stages = db.templateStages
    .filter((s) => s.template_id === templateId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  let totalTasks = 0;
  for (const stage of stages) {
    const stageNodeId = generateId('stg_node');
    db.nodes.push({
      id: stageNodeId,
      parent_id: rootId,
      name: stage.name,
      owner,
      description: `阶段标准交付流`,
      order: stage.order,
      status: 'in_progress',
      created_at: now,
    });

    const deliverables = db.templateDeliverables
      .filter((d) => d.stage_id === stage.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const del of deliverables) {
      totalTasks++;
      const taskId = generateId('task');
      db.tasks.push({
        id: taskId,
        node_id: stageNodeId,
        name: del.name,
        owner,
        due_date: defaultDueDate,
        status: 'pending',
        has_deliverable: true,
        deliverable_requirement: `请交付与归档「${del.name}」相关产出物或验收证明`,
        deliverable_submission: null,
        deliverable_submitted_at: null,
        done_at: null,
        created_at: now,
      });
    }
  }

  recordActivity(db, {
    project_id: rootId,
    node_id: rootId,
    type: 'project_created',
    title: `${owner} 基于模板创建了项目「${name}」`,
    detail: `已初始化 ${stages.length} 个研发阶段，包含 ${totalTasks} 个标准交付任务`,
    author: owner,
  });

  persistDb();
  return rootId;
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
  const db = getDb();
  const node = db.nodes.find((n) => n.id === projectId);
  if (node) {
    node.status = status;
    const statusText = status === 'done' ? '已结项' : status === 'in_progress' ? '进行中' : '未启动';
    recordActivity(db, {
      project_id: projectId,
      node_id: projectId,
      type: 'project_updated',
      title: `${node.owner} 将项目状态调整为「${statusText}」`,
      author: node.owner,
    });
    persistDb();
  }
}

export async function updateProjectPriority(projectId: string, priority: ProjectPriority): Promise<void> {
  const db = getDb();
  const node = db.nodes.find((n) => n.id === projectId);
  if (node) {
    const oldPriority = node.priority || 'P1';
    node.priority = priority;
    recordActivity(db, {
      project_id: projectId,
      node_id: projectId,
      type: 'project_updated',
      title: `${node.owner} 将项目优先级由 ${oldPriority} 调整为「${priority}」`,
      detail: `- 优先级: ${oldPriority}\n+ 优先级: ${priority}`,
      author: node.owner,
    });
    persistDb();
  }
}

export async function addNode(
  parentId: string,
  name: string,
  owner: string,
  description?: string,
  estimatedDuration?: string
): Promise<string> {
  const db = getDb();
  const id = generateId('node');
  const now = new Date().toISOString();
  const siblingCount = db.nodes.filter((n) => n.parent_id === parentId).length;

  db.nodes.push({
    id,
    parent_id: parentId,
    name,
    owner,
    description: description?.trim() || undefined,
    estimated_duration: estimatedDuration?.trim() || undefined,
    order: siblingCount + 1,
    status: 'in_progress',
    created_at: now,
  });

  const rootId = findRootProjectId(db, parentId);
  const parentNode = db.nodes.find((n) => n.id === parentId);
  const detailParts: string[] = [
    `+ 模块分组: ${name}`,
    `+ 负责人: ${owner}`,
  ];
  if (estimatedDuration?.trim()) detailParts.push(`+ 预估周期: ${estimatedDuration.trim()}`);
  if (description?.trim()) detailParts.push(`+ 模块说明: ${description.trim()}`);
  if (parentNode) detailParts.push(`+ 所属父级: ${parentNode.name}`);

  recordActivity(db, {
    project_id: rootId,
    node_id: id,
    type: 'node_created',
    title: `${owner} 新建了模块分组「${name}」`,
    detail: detailParts.join('\n'),
    author: owner,
  });

  persistDb();
  return id;
}

export async function updateNode(
  nodeId: string,
  name: string,
  owner: string,
  description?: string,
  estimatedDuration?: string,
  priority?: ProjectPriority,
  dueDate?: string | null
): Promise<void> {
  const db = getDb();
  const node = db.nodes.find((n) => n.id === nodeId);
  if (node) {
    const rootId = findRootProjectId(db, nodeId);
    const changes = describeNodeDiff(node, { name, owner, description, estimatedDuration });

    if (priority !== undefined && node.priority !== priority) {
      changes.push(`- 优先级: ${node.priority || 'P1'}`);
      changes.push(`+ 优先级: ${priority}`);
      node.priority = priority;
    }

    if (dueDate !== undefined && node.due_date !== dueDate) {
      changes.push(`- 计划截止日: ${node.due_date || '未排期'}`);
      changes.push(`+ 计划截止日: ${dueDate || '未排期'}`);
      node.due_date = dueDate || null;
    }

    node.name = name;
    node.owner = owner;
    if (description !== undefined) node.description = description.trim() || undefined;
    if (estimatedDuration !== undefined) node.estimated_duration = estimatedDuration.trim() || undefined;

    if (changes.length > 0) {
      const isRoot = node.parent_id === null;
      recordActivity(db, {
        project_id: rootId,
        node_id: nodeId,
        type: isRoot ? 'project_updated' : 'node_updated',
        title: isRoot
          ? `${owner} 更新了项目「${name}」的基础信息`
          : `${owner} 修改了模块「${name}」的配置信息`,
        detail: changes.join('\n'),
        author: owner,
      });
    }

    persistDb();
  }
}

export async function deleteNodeCascading(nodeId: string): Promise<void> {
  const db = getDb();
  const targetNode = db.nodes.find((n) => n.id === nodeId);
  const rootId = findRootProjectId(db, nodeId);
  const subtreeIds = new Set(getSubtreeNodeIds(db, nodeId));

  // 获取该子树下的所有任务 ID
  const taskIdsToDelete = new Set(
    db.tasks.filter((t) => subtreeIds.has(t.node_id)).map((t) => t.id)
  );

  if (targetNode) {
    const detailParts: string[] = [
      `- 模块分组: ${targetNode.name}`,
      `- 负责人: ${targetNode.owner}`,
      `- 级联清理任务: 共 ${taskIdsToDelete.size} 个任务`,
    ];
    recordActivity(db, {
      project_id: rootId,
      type: 'node_deleted',
      title: `删除了分组节点「${targetNode.name}」及下属 ${taskIdsToDelete.size} 个任务`,
      detail: detailParts.join('\n'),
      author: targetNode.owner,
    });
  }

  // 删除关联评论
  db.comments = db.comments.filter(
    (c) =>
      (!c.node_id || !subtreeIds.has(c.node_id)) &&
      (!c.task_id || !taskIdsToDelete.has(c.task_id))
  );

  // 删除任务
  db.tasks = db.tasks.filter((t) => !subtreeIds.has(t.node_id));

  // 删除节点
  db.nodes = db.nodes.filter((n) => !subtreeIds.has(n.id));

  persistDb();
}

// Re-export task, comment and template services for convenience
export { addTask, updateTask, toggleTaskStatus, deleteTask } from './task-mutations';
export { getComments, addComment } from './comment-service';
export { getTemplates, createTemplate, deleteTemplate } from './template-service';

