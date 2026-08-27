'use client';

import React from 'react';
import { DashboardMetrics } from '@/lib/types';
import { FolderGit2, CheckCircle2, Clock, AlertTriangle, CheckSquare, ArrowRight, ShieldAlert } from 'lucide-react';

interface DashboardSummaryProps {
  metrics: DashboardMetrics;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

export function DashboardSummary({ metrics, activeFilter, onSelectFilter }: DashboardSummaryProps) {
  const overdueCount = metrics.overdueProjectsCount || 0;
  const dueSoonCount = metrics.dueSoonProjectsCount || 0;
  const totalRiskCount = metrics.riskProjectsCount ?? (overdueCount + dueSoonCount);
  const hasRisk = overdueCount > 0 || dueSoonCount > 0;

  const handleRiskCardClick = () => {
    if (onSelectFilter) {
      if (hasRisk) {
        onSelectFilter('risk');
      } else {
        onSelectFilter('in_progress');
      }
      // 平滑滚动到项目表格
      const tableElem = document.getElementById('project-list-section') || document.getElementById('search-project-input');
      if (tableElem) {
        tableElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="项目全局统计">
      {/* 总项目 */}
      <div
        id="metric-card-total"
        onClick={() => onSelectFilter?.('all')}
        className={`rounded-xl border p-3 shadow-xs transition-all ${
          onSelectFilter ? 'cursor-pointer hover:shadow-sm hover:border-zinc-300' : ''
        } ${activeFilter === 'all' ? 'ring-2 ring-zinc-900 border-zinc-900 bg-zinc-50/50' : 'border-zinc-200 bg-white'}`}
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
        <div className="mt-1.5 text-[11px] text-zinc-500 flex items-center gap-1.5">
          <span>未开始: <span className="font-medium text-zinc-700">{metrics.unstartedCount}</span></span>
          <span className="text-zinc-300">•</span>
          <span>暂停中: <span className="font-medium text-zinc-700">{metrics.suspendedCount || 0}</span></span>
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

      {/* 进行中与风险预警 (超期 + 1天内到期) */}
      <div
        id="metric-card-in-progress-and-overdue"
        onClick={handleRiskCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRiskCardClick();
          }
        }}
        className={`group rounded-xl border p-3 shadow-xs transition-all cursor-pointer relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
          activeFilter === 'risk' || activeFilter === 'overdue'
            ? 'ring-2 ring-red-500 border-red-300 bg-red-50/60 shadow-sm'
            : overdueCount > 0
            ? 'border-red-200 bg-red-50/40 hover:bg-red-50/70 hover:border-red-300 hover:shadow-sm'
            : dueSoonCount > 0
            ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-300 hover:shadow-sm'
            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium uppercase tracking-wider ${
            overdueCount > 0
              ? 'text-red-700 font-semibold'
              : dueSoonCount > 0
              ? 'text-amber-800 font-semibold'
              : 'text-zinc-500'
          }`}>
            进行中与风险预警
          </span>
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${
            overdueCount > 0
              ? 'bg-red-100 text-red-600 animate-pulse'
              : dueSoonCount > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-amber-50 text-amber-600'
          }`}>
            {overdueCount > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : dueSoonCount > 0 ? (
              <ShieldAlert className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold tracking-tight text-zinc-900">{metrics.inProgressCount}</span>
          <span className="text-xs text-zinc-500">进行中</span>

          {/* 延期徽章 */}
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 shrink-0 border border-red-200">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              <span>{overdueCount} 延期</span>
            </span>
          )}

          {/* 1天内到期徽章 */}
          {dueSoonCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 shrink-0 border border-amber-200">
              <Clock className="h-2.5 w-2.5 shrink-0" />
              <span>{dueSoonCount} 1天内到期</span>
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          {overdueCount > 0 && dueSoonCount > 0 ? (
            <span className="font-medium text-red-600 truncate">
              {overdueCount} 延期 · {dueSoonCount} 临期待排查
            </span>
          ) : overdueCount > 0 ? (
            <span className="font-medium text-red-600 truncate">存在超期项目，需重点推进</span>
          ) : dueSoonCount > 0 ? (
            <span className="font-medium text-amber-700 truncate">有项目 1 天内即将到期</span>
          ) : (
            <span className="text-zinc-500">项目均按期正常运行中</span>
          )}

          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-zinc-400 group-hover:text-blue-600 transition-colors shrink-0">
            <span>筛选</span>
            <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* 提前总天数 */}
      <div
        id="metric-card-done"
        onClick={() => onSelectFilter?.('done')}
        className={`rounded-xl border p-3 shadow-xs transition-all ${
          onSelectFilter ? 'cursor-pointer hover:shadow-sm hover:border-zinc-300' : ''
        } ${activeFilter === 'done' ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/40' : 'border-zinc-200 bg-white'}`}
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
