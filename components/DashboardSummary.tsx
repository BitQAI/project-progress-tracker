'use client';

import React from 'react';
import { DashboardMetrics } from '@/lib/types';
import { FolderGit2, CheckCircle2, Clock, AlertTriangle, CheckSquare } from 'lucide-react';

interface DashboardSummaryProps {
  metrics: DashboardMetrics;
}

export function DashboardSummary({ metrics }: DashboardSummaryProps) {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="项目全局统计">
      {/* 总项目 */}
      <div
        id="metric-card-total"
        className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">项目总数</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <FolderGit2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-zinc-900">{metrics.totalProjects}</span>
          <span className="text-xs text-zinc-500">个项目</span>
        </div>
        <div className="mt-1.5 text-[11px] text-zinc-500">
          未开始: <span className="font-medium text-zinc-700">{metrics.unstartedCount}</span>
        </div>
      </div>

      {/* 整体完成度 */}
      <div
        id="metric-card-progress"
        className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">项目整体完成度</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CheckSquare className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-zinc-900">{metrics.averageProgress}%</span>
          <span className="text-xs text-zinc-500">
            ({metrics.completedTasksCount}/{metrics.totalTasksCount} 任务)
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(100, metrics.averageProgress)}%` }}
          />
        </div>
      </div>

      {/* 进行中与超期预警 (合并) */}
      <div
        id="metric-card-in-progress-and-overdue"
        className={`rounded-xl border p-3 shadow-xs transition-shadow hover:shadow-sm ${
          metrics.overdueProjectsCount > 0
            ? 'border-red-200 bg-red-50/40'
            : 'border-zinc-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium uppercase tracking-wider ${
            metrics.overdueProjectsCount > 0 ? 'text-red-700' : 'text-zinc-500'
          }`}>
            进行中与风险预警
          </span>
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            metrics.overdueProjectsCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-amber-50 text-amber-600'
          }`}>
            {metrics.overdueProjectsCount > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold tracking-tight text-zinc-900">{metrics.inProgressCount}</span>
          <span className="text-xs text-zinc-500">进行中</span>
          {metrics.overdueProjectsCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 shrink-0">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              <span>{metrics.overdueProjectsCount} 延期</span>
            </span>
          )}
        </div>
        <div className="mt-1.5 text-[11px]">
          {metrics.overdueProjectsCount > 0 ? (
            <span className="font-medium text-red-600">存在超期项目，需重点推进</span>
          ) : (
            <span className="text-zinc-500">项目均按期正常运行中</span>
          )}
        </div>
      </div>

      {/* 提前总天数 */}
      <div
        id="metric-card-done"
        className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">提前总天数</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-emerald-700">{metrics.totalEarlyDays || 0}</span>
          <span className="text-xs text-zinc-500">天</span>
        </div>
        <div className="mt-1.5 text-[11px] text-emerald-600">
          已结项 {metrics.doneCount} 个项目
        </div>
      </div>
    </section>
  );
}
