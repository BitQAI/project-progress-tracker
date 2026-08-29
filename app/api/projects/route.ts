import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard-service';
import { createProjectFromScratch, createProjectFromTemplate } from '@/lib/mutations';
import { ensureDbLoaded } from '@/lib/db';

export async function GET() {
  try {
    const t0 = performance.now();
    await ensureDbLoaded();
    const t1 = performance.now();
    const data = await getDashboardData();
    const t2 = performance.now();
    
    return NextResponse.json({
      ok: true,
      data,
      _perf: {
        dbMs: Math.round(t1 - t0),
        calcMs: Math.round(t2 - t1),
        totalMs: Math.round(t2 - t0),
      }
    }, {
      headers: {
        'Server-Timing': `db;dur=${(t1 - t0).toFixed(1)}, calc;dur=${(t2 - t1).toFixed(1)}, total;dur=${(t2 - t0).toFixed(1)}`
      }
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
