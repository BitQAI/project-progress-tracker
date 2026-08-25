import { NextRequest, NextResponse } from 'next/server';
import { ensureDbLoaded } from '@/lib/db';
import { batchImportWbsDraft } from '@/lib/wbs-import-service';
import { BatchImportPayload } from '@/lib/ai-wbs-types';

export async function POST(req: NextRequest) {
  try {
    await ensureDbLoaded();
    const body = (await req.json()) as BatchImportPayload;

    if (!body.projectId || !body.targetLevel) {
      return NextResponse.json({ ok: false, error: '缺少目标项目或层级参数' }, { status: 400 });
    }

    const result = await batchImportWbsDraft(body);
    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Batch import error:', error);
    return NextResponse.json({ ok: false, error: error.message || '批量导入失败' }, { status: 500 });
  }
}
