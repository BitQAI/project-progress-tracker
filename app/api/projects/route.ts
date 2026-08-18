import { NextRequest, NextResponse } from 'next/server';
import { getProjectsSummaryList, getDashboardMetrics } from '@/lib/project-service';
import { createProjectFromScratch, createProjectFromTemplate } from '@/lib/mutations';

export async function GET() {
  try {
    const [summaries, metrics] = await Promise.all([
      getProjectsSummaryList(),
      getDashboardMetrics(),
    ]);
    return NextResponse.json({ ok: true, data: { summaries, metrics } });
  } catch (error: any) {
    console.error('API projects error:', error);
    return NextResponse.json({ ok: false, error: error.message || '获取项目列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, owner, templateId, description, estimatedDuration, priority } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: '项目名称不能为空' }, { status: 400 });
    }
    if (!owner || !owner.trim()) {
      return NextResponse.json({ ok: false, error: '负责人不能为空' }, { status: 400 });
    }

    let projectId: string;
    if (templateId) {
      projectId = await createProjectFromTemplate(
        name.trim(),
        owner.trim(),
        templateId,
        description,
        estimatedDuration,
        priority
      );
    } else {
      projectId = await createProjectFromScratch(
        name.trim(),
        owner.trim(),
        description,
        estimatedDuration,
        priority
      );
    }

    return NextResponse.json({ ok: true, data: { id: projectId } });
  } catch (error: any) {
    console.error('Create project error:', error);
    return NextResponse.json({ ok: false, error: error.message || '创建项目失败' }, { status: 500 });
  }
}
