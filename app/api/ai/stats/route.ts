import { NextResponse } from 'next/server';
import { getDb, ensureDbLoaded } from '@/lib/db';
import { getProjectsSummaryList } from '@/lib/project-service';

export async function GET() {
  try {
    const db = await ensureDbLoaded();
    const summaries = await getProjectsSummaryList();

    // 1. 基础项目指标
    const totalProjects = summaries.length;
    const todayStr = new Date().toISOString().split('T')[0];

    // 2. 统计任务状态分布
    const totalTasks = db.tasks.length;
    const completedTasksCount = db.tasks.filter(t => t.status === 'done').length;
    const overdueTasksCount = db.tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr).length;
    const pendingTasksCount = totalTasks - completedTasksCount - overdueTasksCount;

    // 3. 核心项目进度平均值
    const overallProgress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    // 4. 计算过去一周的每日项目进度趋势
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const trendData = dates.map(day => {
      const completedOnOrBefore = db.tasks.filter(t => {
        if (t.status !== 'done') return false;
        if (!t.done_at) return true; // 如果没有具体完结时间，默认已经完成
        return t.done_at.split('T')[0] <= day;
      }).length;

      const progress = totalTasks > 0 ? Math.round((completedOnOrBefore / totalTasks) * 100) : 0;
      return {
        name: day.substring(5), // 格式化为 'MM-dd'
        进度: progress
      };
    });

    // 5. 趋势分析与潜在进度停滞报警
    const startProgress = trendData[0].进度;
    const endProgress = trendData[6].进度;
    const growthRate = endProgress - startProgress;
    const averageWeeklyGrowth = Math.round((growthRate / 7) * 10) / 10; // 日均进度增长率
    const isStagnating = growthRate <= 2; // 一周增长率低于或等于 2% 视为潜在进度停滞风险

    // 6. 提炼关键未完成项 (逾期或3天内临期的非完成任务)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

    const criticalPendingTasks = db.tasks
      .filter(t => t.status !== 'done')
      .map(t => {
        const isOverdue = t.due_date && t.due_date < todayStr;
        const isDueSoon = t.due_date && t.due_date >= todayStr && t.due_date <= threeDaysLaterStr;
        let priority = 3; // 正常
        if (isOverdue) priority = 1; // 严重
        else if (isDueSoon) priority = 2; // 警告

        return {
          id: t.id,
          name: t.name,
          owner: t.owner,
          dueDate: t.due_date || '无',
          isOverdue,
          priority
        };
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3); // 提取前 3 个最紧急的

    // 7. 整理每个项目的进度对比数据
    const projectProgressData = summaries.map(p => ({
      name: p.name.length > 8 ? p.name.substring(0, 8) + '...' : p.name,
      进度: p.progress
    }));

    // 8. 整理任务分布比例数据
    const taskStatusData = [
      { name: '已完成', value: completedTasksCount },
      { name: '进行中', value: pendingTasksCount },
      { name: '已逾期', value: overdueTasksCount }
    ];

    return NextResponse.json({
      ok: true,
      metrics: {
        totalProjects,
        overallProgress,
        overdueTasksCount,
        pendingTasksCount,
        completedTasksCount,
        growthRate,
        averageWeeklyGrowth,
        isStagnating
      },
      criticalPendingTasks,
      trendData,
      projectProgressData,
      taskStatusData
    });

  } catch (error: any) {
    console.error('API /api/ai/stats GET handler error:', error);
    return NextResponse.json({ ok: false, error: error.message || '获取系统统计数据失败' }, { status: 500 });
  }
}
