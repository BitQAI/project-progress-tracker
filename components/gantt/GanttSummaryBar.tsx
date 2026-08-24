'use client';

import React from 'react';
import { GanttItem, GanttViewMode, diffDays } from './gantt-utils';
import { Clock, CheckCircle2, AlertTriangle, PackageCheck, Calendar, ZoomIn, ZoomOut, Compass, ChevronDown, ChevronRight } from 'lucide-react';
import { getTodayBeijingString } from '@/lib/date-utils';

interface GanttSummaryBarProps {
  items: GanttItem[];
  projectItem: GanttItem | undefined;
  viewMode: GanttViewMode;
  onViewModeChange: (mode: GanttViewMode) => void;
  onScrollToToday: () => void;
  isAllExpanded: boolean;
  onToggleExpandAll: () => void;
  hideUnscheduled: boolean;
  onToggleHideUnscheduled: () => void;
  unscheduledCount: number;
}

export function GanttSummaryBar({
  items,
  projectItem,
  viewMode,
  onViewModeChange,
  onScrollToToday,
  isAllExpanded,
  onToggleExpandAll,
  hideUnscheduled,
  onToggleHideUnscheduled,
  unscheduledCount,
}: GanttSummaryBarProps) {
  const todayStr = getTodayBeijingString();

  // 统计指标
  const tasks = items.filter((it) => it.type === 'task');
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : projectItem?.progressPercent || 0;

  const overdueItems = items.filter((it) => it.isOverdue);
  const overdueCount = overdueItems.length;

  const deliverableTasks = tasks.filter((t) => t.hasDeliverable);
  const submittedDeliverables = deliverableTasks.filter((t) => t.deliverableSubmitted).length;

  // 项目周期计算
  const startDate = projectItem?.startDate || todayStr;
  const dueDate = projectItem?.dueDate || todayStr;
  const totalDurationDays = Math.max(1, diffDays(startDate, dueDate));
  const remainingDays = diffDays(todayStr, dueDate);

  return (
    <div className="space-y-3">
      {/* 顶部老板视角 KPI 概览卡片 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. 项目总周期 */}
        <div className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/50 p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>项目周期跨度</span>
              <span className="font-semibold text-zinc-800">{totalDurationDays} 天</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 truncate">
              <span className="text-xs font-bold text-zinc-900 font-mono">{startDate}</span>
              <span className="text-xs text-zinc-400">至</span>
              <span className="text-xs font-bold text-zinc-900 font-mono">{dueDate}</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {remainingDays > 0 ? (
                <span className="text-blue-600 font-medium">距交付还有 {remainingDays} 天</span>
              ) : remainingDays === 0 ? (
                <span className="text-amber-600 font-medium">今天为计划交付日</span>
              ) : (
                <span className="text-red-600 font-medium">已超出原交付期 {Math.abs(remainingDays)} 天</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. 总体完工进度 */}
        <div className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/50 p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>总体进度 (WBS)</span>
              <span className="text-xs font-bold text-emerald-600">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
              <span>已完成: {doneTasks} 项</span>
              <span>总任务: {totalTasks} 项</span>
            </div>
          </div>
        </div>

        {/* 3. 延期与风险预警 */}
        <div className={`flex items-center gap-3.5 rounded-xl border p-3.5 shadow-2xs ${
          overdueCount > 0
            ? 'border-red-200 bg-red-50/30'
            : 'border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/50'
        }`}>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            overdueCount > 0
              ? 'bg-red-100/80 text-red-600 border-red-200'
              : 'bg-zinc-100 text-zinc-400 border-zinc-200'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>延期风险管控</span>
              <span className={`text-xs font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-zinc-600'}`}>
                {overdueCount > 0 ? `${overdueCount} 节点受阻` : '运行平稳'}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-700 truncate">
              {overdueCount > 0
                ? `${overdueItems[0].name} 等存在逾期风险`
                : '当前各阶段任务均按期推进中'}
            </p>
            <div className="mt-1 text-[11px] text-zinc-500">
              {overdueCount > 0 ? (
                <span className="text-red-600 font-medium">建议重点跟进前置卡点</span>
              ) : (
                <span>关键路径无延期滞后</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. 交付物留档保障 */}
        <div className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/50 p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>证据链与交付件</span>
              <span className="text-xs font-bold text-indigo-600">
                {deliverableTasks.length > 0 ? `${submittedDeliverables}/${deliverableTasks.length}` : '免交付物'}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">{submittedDeliverables}</span>
              <span className="text-zinc-400">/</span>
              <span>已提交留档</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {deliverableTasks.length > 0
                ? `留档率 ${Math.round((submittedDeliverables / deliverableTasks.length) * 100)}%`
                : '标准流程管控'}
            </div>
          </div>
        </div>
      </div>

      {/* 甘特图控制栏：缩放模式、展开/折叠、快速定位、待排期过滤 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* 展开/折叠全部 */}
          <button
            type="button"
            id="gantt-toggle-expand-all-btn"
            onClick={onToggleExpandAll}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            {isAllExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>{isAllExpanded ? '全部折叠' : '全部展开'}</span>
          </button>

          {/* 定位今天 */}
          <button
            type="button"
            id="gantt-scroll-today-btn"
            onClick={onScrollToToday}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <Compass className="h-3.5 w-3.5 text-blue-600" />
            <span>定位今天 (Today)</span>
          </button>

          {/* 待排期任务显隐切换 */}
          {unscheduledCount > 0 && (
            <button
              type="button"
              id="gantt-toggle-unscheduled-btn"
              onClick={onToggleHideUnscheduled}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                hideUnscheduled
                  ? 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800 shadow-2xs'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              <span>{hideUnscheduled ? '显示待排期项' : '包含待排期项'}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  hideUnscheduled ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-200/80 text-amber-900'
                }`}
              >
                {unscheduledCount}
              </span>
            </button>
          )}
        </div>

        {/* 粒度缩放 Segmented Control */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium mr-1">时间刻度:</span>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              id="gantt-view-mode-day"
              onClick={() => onViewModeChange('day')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === 'day'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              按日 (Day)
            </button>
            <button
              type="button"
              id="gantt-view-mode-week"
              onClick={() => onViewModeChange('week')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              按周 (Week)
            </button>
            <button
              type="button"
              id="gantt-view-mode-month"
              onClick={() => onViewModeChange('month')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              按月 (Month)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
