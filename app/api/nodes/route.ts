import { NextRequest, NextResponse } from 'next/server';
import { addNode, updateNode, deleteNodeCascading } from '@/lib/mutations';
import { ensureDbLoaded } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const body = await req.json();
    const { parentId, name, owner, description, estimatedDuration, dueDate } = body;
    if (!parentId || !name?.trim() || !owner?.trim()) {
      return NextResponse.json({ ok: false, error: '父节点ID、名称与负责人均不能为空' }, { status: 400 });
    }
    const nodeId = await addNode(parentId, name.trim(), owner.trim(), description, estimatedDuration, dueDate);
    return NextResponse.json({ ok: true, data: { id: nodeId } });
  } catch (error: any) {
    console.error('Add node error:', error);
    return NextResponse.json({ ok: false, error: error.message || '添加子节点失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const body = await req.json();
    const { id, name, owner, description, estimatedDuration, priority, dueDate, changeReason } = body;
    if (!id || !name?.trim() || !owner?.trim()) {
      return NextResponse.json({ ok: false, error: '节点ID、名称与负责人均不能为空' }, { status: 400 });
    }
    await updateNode(id, name.trim(), owner.trim(), description, estimatedDuration, priority, dueDate, changeReason);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Update node error:', error);
    return NextResponse.json({ ok: false, error: error.message || '更新节点失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少节点ID' }, { status: 400 });
    }
    await deleteNodeCascading(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete node error:', error);
    return NextResponse.json({ ok: false, error: error.message || '删除节点失败' }, { status: 500 });
  }
}
