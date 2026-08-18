import { NextRequest, NextResponse } from 'next/server';
import { getProjectTree } from '@/lib/project-service';
import { updateProjectStatus, deleteNodeCascading } from '@/lib/mutations';
import { ProjectStatus } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const tree = await getProjectTree(id);
    if (!tree) {
      return NextResponse.json({ ok: false, error: '未找到指定项目' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: tree });
  } catch (error: any) {
    console.error('Get project tree error:', error);
    return NextResponse.json({ ok: false, error: error.message || '获取项目失败' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const { status } = body;
    if (!status || !['unstarted', 'in_progress', 'done'].includes(status)) {
      return NextResponse.json({ ok: false, error: '非法的项目状态' }, { status: 400 });
    }
    await updateProjectStatus(id, status as ProjectStatus);
    const updatedTree = await getProjectTree(id);
    return NextResponse.json({ ok: true, data: updatedTree });
  } catch (error: any) {
    console.error('Update project status error:', error);
    return NextResponse.json({ ok: false, error: error.message || '更新项目状态失败' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    await deleteNodeCascading(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return NextResponse.json({ ok: false, error: error.message || '删除项目失败' }, { status: 500 });
  }
}
