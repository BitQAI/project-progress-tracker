import { NextRequest, NextResponse } from 'next/server';
import { getComments, addComment } from '@/lib/comment-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nodeId = searchParams.get('nodeId') || undefined;
    const taskId = searchParams.get('taskId') || undefined;

    if (!nodeId && !taskId) {
      return NextResponse.json({ ok: false, error: '必须指定 nodeId 或 taskId' }, { status: 400 });
    }

    const comments = await getComments({ nodeId, taskId });
    return NextResponse.json({ ok: true, data: comments });
  } catch (error: any) {
    console.error('Get comments error:', error);
    return NextResponse.json({ ok: false, error: error.message || '获取评论列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodeId, taskId, parentId, author, content } = body;

    if (!author?.trim() || !content?.trim()) {
      return NextResponse.json({ ok: false, error: '姓名/称呼与评论内容不能为空' }, { status: 400 });
    }
    if (!nodeId && !taskId) {
      return NextResponse.json({ ok: false, error: '必须关联节点或任务' }, { status: 400 });
    }

    const commentId = await addComment({
      nodeId,
      taskId,
      parentId,
      author: author.trim(),
      content: content.trim(),
    });

    const updatedComments = await getComments({ nodeId, taskId });
    return NextResponse.json({ ok: true, data: { id: commentId, comments: updatedComments } });
  } catch (error: any) {
    console.error('Add comment error:', error);
    return NextResponse.json({ ok: false, error: error.message || '发表评论失败' }, { status: 500 });
  }
}
