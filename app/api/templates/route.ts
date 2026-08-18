import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, createTemplate, deleteTemplate } from '@/lib/template-service';
import { ensureDbLoaded } from '@/lib/db';

export async function GET() {
  try {
    await ensureDbLoaded();
    const templates = await getTemplates();
    return NextResponse.json({ ok: true, data: templates });
  } catch (error: any) {
    console.error('Get templates error:', error);
    return NextResponse.json({ ok: false, error: error.message || '获取模板列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const body = await req.json();
    const { name, stages } = body;

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: '模板名称不能为空' }, { status: 400 });
    }
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ ok: false, error: '至少需要包含一个阶段' }, { status: 400 });
    }

    const tplId = await createTemplate(name.trim(), stages);
    return NextResponse.json({ ok: true, data: { id: tplId } });
  } catch (error: any) {
    console.error('Create template error:', error);
    return NextResponse.json({ ok: false, error: error.message || '创建模板失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少模板ID' }, { status: 400 });
    }
    await deleteTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete template error:', error);
    return NextResponse.json({ ok: false, error: error.message || '删除模板失败' }, { status: 500 });
  }
}
