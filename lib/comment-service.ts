import { getDb, persistDb } from './db';
import { findRootProjectId, findRootProjectIdByTask, recordActivity } from './activity-logger';
import { DbComment, CommentWithReplies, FileAttachment } from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function getComments(target: {
  nodeId?: string;
  taskId?: string;
}): Promise<CommentWithReplies[]> {
  const db = getDb();
  let flatComments: DbComment[] = [];

  if (target.taskId) {
    flatComments = db.comments.filter((c) => c.task_id === target.taskId);
  } else if (target.nodeId) {
    flatComments = db.comments.filter((c) => c.node_id === target.nodeId);
  }

  // 构造嵌套回复树
  const commentMap = new Map<string, CommentWithReplies>();
  const roots: CommentWithReplies[] = [];

  flatComments.forEach((c) => {
    commentMap.set(c.id, { ...c, replies: [] });
  });

  flatComments.forEach((c) => {
    const current = commentMap.get(c.id)!;
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id)!.replies!.push(current);
    } else {
      roots.push(current);
    }
  });

  roots.reverse();
  return roots;
}

export async function addComment(params: {
  nodeId?: string | null;
  taskId?: string | null;
  parentId?: string | null;
  author: string;
  content: string;
  imageUrl?: string | null;
  attachments?: FileAttachment[];
}): Promise<string> {
  const db = getDb();
  const id = generateId('cmt');
  const now = new Date().toISOString();
  
  const finalImageUrl = params.imageUrl || (params.attachments?.find(a => a.type === 'image')?.url) || null;

  db.comments.push({
    id,
    node_id: params.nodeId || null,
    task_id: params.taskId || null,
    parent_id: params.parentId || null,
    author: params.author,
    content: params.content,
    created_at: now,
    image_url: finalImageUrl,
    attachments: params.attachments && params.attachments.length > 0 ? params.attachments : undefined,
  });

  let rootId = '';
  let targetName = '相应项';
  let isTask = false;
  if (params.taskId) {
    const rootInfo = findRootProjectIdByTask(db, params.taskId);
    rootId = rootInfo.projectId;
    if (rootInfo.task) {
      targetName = rootInfo.task.name;
      isTask = true;
    }
  } else if (params.nodeId) {
    rootId = findRootProjectId(db, params.nodeId);
    const node = db.nodes.find((n) => n.id === params.nodeId);
    if (node) {
      targetName = node.name;
    }
  }

  if (rootId) {
    const hasAttachments = !!(finalImageUrl || (params.attachments && params.attachments.length > 0));
    let title = '';
    if (hasAttachments) {
      title = `${params.author} 记录了「${targetName}」${isTask ? '任务' : ''}的进展备注与证据链`;
    } else {
      title = `${params.author} 记录了「${targetName}」${isTask ? '任务' : ''}的关键业务进展与工作指示`;
    }

    recordActivity(db, {
      project_id: rootId,
      node_id: params.nodeId,
      task_id: params.taskId,
      type: 'comment_added',
      title,
      detail: params.content,
      author: params.author,
      image_url: finalImageUrl,
      attachments: params.attachments,
    });
  }

  await persistDb();
  return id;
}

export async function getProjectComments(projectId: string): Promise<(CommentWithReplies & { targetName?: string; isTask?: boolean })[]> {
  const db = getDb();
  
  const projectComments = db.comments.filter((c) => {
    if (c.node_id) {
      return findRootProjectId(db, c.node_id) === projectId;
    }
    if (c.task_id) {
      return findRootProjectIdByTask(db, c.task_id).projectId === projectId;
    }
    return false;
  });

  const commentMap = new Map<string, CommentWithReplies & { targetName?: string; isTask?: boolean }>();
  const results: (CommentWithReplies & { targetName?: string; isTask?: boolean })[] = [];

  projectComments.forEach((c) => {
    let targetName = '项目';
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

    commentMap.set(c.id, { ...c, targetName, isTask, replies: [] });
  });

  projectComments.forEach((c) => {
    const current = commentMap.get(c.id)!;
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id)!.replies!.push(current);
    } else {
      results.push(current);
    }
  });

  results.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return results;
}
