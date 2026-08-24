import { NextRequest, NextResponse } from 'next/server';
import { addTask, updateTask, toggleTaskStatus, deleteTask } from '@/lib/mutations';
import { TaskStatus } from '@/lib/types';
import { ensureDbLoaded } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const body = await req.json();
    const {
      nodeId,
      name,
      owner,
      dueDate,
      hasDeliverable,
      deliverableRequirement,
      estimatedDuration,
      deliverableItems,
      deliverableAttachments,
    } = body;
    if (!nodeId || !name?.trim() || !owner?.trim()) {
      return NextResponse.json({ ok: false, error: '节点ID、任务名称与负责人均不能为空' }, { status: 400 });
    }
    const taskId = await addTask(
      nodeId,
      name.trim(),
      owner.trim(),
      dueDate,
      hasDeliverable,
      deliverableRequirement,
      estimatedDuration,
      deliverableItems,
      deliverableAttachments
    );
    return NextResponse.json({ ok: true, data: { id: taskId } });
  } catch (error: any) {
    console.error('Add task error:', error);
    return NextResponse.json({ ok: false, error: error.message || '添加任务失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const body = await req.json();
    const {
      id,
      name,
      owner,
      dueDate,
      hasDeliverable,
      deliverableRequirement,
      deliverableSubmission,
      doneAt,
      status,
      estimatedDuration,
      deliverableItems,
      changeReason,
      deliverableAttachments,
    } = body;
    if (!id || !name?.trim() || !owner?.trim()) {
      return NextResponse.json({ ok: false, error: '任务ID、名称与负责人均不能为空' }, { status: 400 });
    }
    await updateTask(
      id,
      name.trim(),
      owner.trim(),
      dueDate,
      hasDeliverable,
      deliverableRequirement,
      deliverableSubmission,
      doneAt,
      status,
      estimatedDuration,
      deliverableItems,
      changeReason,
      deliverableAttachments
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json({ ok: false, error: error.message || '更新任务失败' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const body = await req.json();
    const { id, status, deliverableSubmission, doneAt, deliverableAttachments } = body;
    if (!id || !status || !['pending', 'done'].includes(status)) {
      return NextResponse.json({ ok: false, error: '任务ID与状态参数无效' }, { status: 400 });
    }
    await toggleTaskStatus(id, status as TaskStatus, deliverableSubmission, doneAt, deliverableAttachments);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Toggle task status error:', error);
    return NextResponse.json({ ok: false, error: error.message || '更新任务状态失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少任务ID' }, { status: 400 });
    }
    await deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete task error:', error);
    return NextResponse.json({ ok: false, error: error.message || '删除任务失败' }, { status: 500 });
  }
}
