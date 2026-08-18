'use client';

import React from 'react';
import { DashboardMetrics } from '@/lib/types';
import { FolderGit2, CheckCircle2, Clock, AlertTriangle, CheckSquare } from 'lucide-react';

interface DashboardSummaryProps {
  metrics: DashboardMetrics;
}

export function DashboardSummary({ metrics }: DashboardSummaryProps) {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="项目全局统计">
      {/* 总项目 */}
      <div
        id="metric-card-total"
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">项目总数</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <FolderGit2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900">{metrics.totalProjects}</span>
          <span className="text-xs text-zinc-500">个项目</span>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          未开始: <span className="font-medium text-zinc-700">{metrics.unstartedCount}</span>
        </div>
      </div>

      {/* 平均进度 */}
      <div
        id="metric-card-progress"
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">平均完成率</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CheckSquare className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900">{metrics.averageProgress}%</span>
          <span className="text-xs text-zinc-500">
            ({metrics.completedTasksCount}/{metrics.totalTasksCount} 任务)
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(100, metrics.averageProgress)}%` }}
          />
        </div>
      </div>

      {/* 进行中 */}
      <div
        id="metric-card-in-progress"
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">进行中项目</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900">{metrics.inProgressCount}</span>
          <span className="text-xs text-zinc-500">正在推进</span>
        </div>
        <div className="mt-2 text-xs text-amber-700">
          核心攻坚期
        </div>
      </div>

      {/* 已完成 */}
      <div
        id="metric-card-done"
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">已结项项目</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-emerald-700">{metrics.doneCount}</span>
          <span className="text-xs text-zinc-500">已交付</span>
        </div>
        <div className="mt-2 text-xs text-emerald-600">
          100% 验收归档
        </div>
      </div>

      {/* 超期预警 */}
      <div
        id="metric-card-overdue"
        className={`col-span-2 rounded-xl border p-4 shadow-xs sm:col-span-1 transition-shadow hover:shadow-sm ${
          metrics.overdueProjectsCount > 0
            ? 'border-red-200 bg-red-50/50'
            : 'border-zinc-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium uppercase tracking-wider ${
            metrics.overdueProjectsCount > 0 ? 'text-red-700' : 'text-zinc-500'
          }`}>
            超期预警
          </span>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            metrics.overdueProjectsCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-zinc-100 text-zinc-500'
          }`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-2xl font-bold tracking-tight ${
            metrics.overdueProjectsCount > 0 ? 'text-red-600' : 'text-zinc-900'
          }`}>
            {metrics.overdueProjectsCount}
          </span>
          <span className="text-xs text-zinc-500">个项目存在延期</span>
        </div>
        <div className="mt-2 text-xs">
          {metrics.overdueProjectsCount > 0 ? (
            <span className="font-medium text-red-600">需重点关注推动</span>
          ) : (
            <span className="text-zinc-500">无任何超期任务</span>
          )}
        </div>
      </div>
    </section>
  );
}
