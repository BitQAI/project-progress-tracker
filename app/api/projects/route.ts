import { NextRequest, NextResponse } from 'next/server';
import { getProjectsSummaryList, getDashboardMetrics } from '@/lib/project-service';
import { getGlobalExecutiveActivities } from '@/lib/executive-activity-service';
import { createProjectFromScratch, createProjectFromTemplate } from '@/lib/mutations';
import { ensureDbLoaded } from '@/lib/db';

export async function GET() {
  try {
    await ensureDbLoaded();
    const [summaries, metrics, executiveActivities] = await Promise.all([
      getProjectsSummaryList(),
      getDashboardMetrics(),
      getGlobalExecutiveActivities(3),
    ]);
    return NextResponse.json({
      ok: true,
      data: { summaries, metrics, executiveActivities },
    });
  } catch (error: any) {
    console.error('API projects error:', error);
    return NextResponse.json({ ok: false, error: error.message || '获取项目列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbLoaded();
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
