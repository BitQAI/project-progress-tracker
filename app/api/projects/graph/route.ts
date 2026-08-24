import { NextResponse } from 'next/server';
import { getAllProjectsGraphData } from '@/lib/graph-service';

export async function GET() {
  try {
    const data = await getAllProjectsGraphData();
    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error('API projects graph error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '获取全景进度拓扑数据失败' },
      { status: 500 }
    );
  }
}
