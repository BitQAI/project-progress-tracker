import { NextRequest, NextResponse } from 'next/server';
import { getPaginatedExecutiveActivities } from '@/lib/executive-activity-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const projectId = searchParams.get('projectId') || undefined;
    const type = searchParams.get('type') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = getPaginatedExecutiveActivities({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
      projectId,
      type,
      search,
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: unknown) {
    console.error('Activities GET error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch executive activities' },
      { status: 500 }
    );
  }
}
