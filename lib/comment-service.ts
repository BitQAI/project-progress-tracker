import { getDb, persistDb } from './db';
import { findRootProjectId, findRootProjectIdByTask, recordActivity } from './activity-logger';
import { DbComment, CommentWithReplies } from './types';

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
}): Promise<string> {
  const db = getDb();
  const id = generateId('cmt');
  const now = new Date().toISOString();
  db.comments.push({
    id,
    node_id: params.nodeId || null,
    task_id: params.taskId || null,
    parent_id: params.parentId || null,
    author: params.author,
    content: params.content,
    created_at: now,
    image_url: params.imageUrl || null,
  });

  let rootId = '';
  if (params.taskId) {
    rootId = findRootProjectIdByTask(db, params.taskId).projectId;
  } else if (params.nodeId) {
    rootId = findRootProjectId(db, params.nodeId);
  }

  if (rootId) {
    recordActivity(db, {
      project_id: rootId,
      node_id: params.nodeId,
      task_id: params.taskId,
      type: 'comment_added',
      title: `${params.author} 发布了进展备注与证据链`,
      detail: params.content,
      author: params.author,
    });
  }

  persistDb();
  return id;
}
