'use client';

import React from 'react';
import { Search, RotateCcw, ChevronRight, ChevronDown, MoveHorizontal, MoveVertical, ShieldAlert, Maximize2 } from 'lucide-react';
import { GraphFilterState, LayoutDirection } from './types';
import { ProjectStatus, ProjectPriority } from '@/lib/types';

interface FlowControlsBarProps {
  filter: GraphFilterState;
  onFilterChange: (newFilter: Partial<GraphFilterState>) => void;
  direction: LayoutDirection;
  onDirectionChange: (dir: LayoutDirection) => void;
  isAllExpanded: boolean;
  onToggleAll: () => void;
  onFitView?: () => void;
  onReset: () => void;
  isLoading: boolean;
  totalNodesCount: number;
}

export function FlowControlsBar({
  filter,
  onFilterChange,
  direction,
  onDirectionChange,
  isAllExpanded,
  onToggleAll,
  onFitView,
  onReset,
  isLoading,
  totalNodesCount,
}: FlowControlsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-xs backdrop-blur-sm">
      {/* 左侧：搜索与过滤 */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* 关键词搜索 */}
        <div className="relative min-w-[200px] max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索项目/模块/负责人..."
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            className="h-8.5 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-900 focus:bg-white focus:outline-none"
          />
        </div>

        {/* 状态过滤 */}
        <div className="flex items-center gap-1">
          <select
            value={filter.statusFilter}
            onChange={(e) => onFilterChange({ statusFilter: e.target.value as any })}
            className="h-8.5 rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100/70 focus:border-zinc-900 focus:outline-none"
          >
            <option value="all">所有状态</option>
            <option value="in_progress">进行中</option>
            <option value="overdue">⚠️ 逾期风险</option>
            <option value="done">已完成</option>
            <option value="unstarted">未开始</option>
            <option value="suspended">已暂停</option>
          </select>
        </div>

        {/* 优先级过滤 */}
        <div className="flex items-center gap-1">
          <select
            value={filter.priorityFilter}
            onChange={(e) => onFilterChange({ priorityFilter: e.target.value as any })}
            className="h-8.5 rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100/70 focus:border-zinc-900 focus:outline-none"
          >
            <option value="all">所有优先级</option>
            <option value="P0">P0 紧急</option>
            <option value="P1">P1 高</option>
            <option value="P2">P2 中</option>
            <option value="P3">P3 低</option>
          </select>
        </div>

        {/* 快捷逾期按钮 */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              statusFilter: filter.statusFilter === 'overdue' ? 'all' : 'overdue',
            })
          }
          className={`flex h-8.5 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-all ${
            filter.statusFilter === 'overdue'
              ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-2xs'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
          <span>仅看逾期</span>
        </button>
      </div>

      {/* 右侧：布局与全局操作 */}
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-zinc-500 sm:inline">
          当前拓扑节点：<b className="text-zinc-800">{totalNodesCount}</b>
        </span>

        <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

        {/* 方向切换 */}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
          <button
            type="button"
            onClick={() => onDirectionChange('LR')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              direction === 'LR'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            title="横向排版（从左向右）"
          >
            <MoveHorizontal className="h-3.5 w-3.5" />
            <span className="hidden md:inline">横向</span>
          </button>
          <button
            type="button"
            onClick={() => onDirectionChange('TB')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              direction === 'TB'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            title="纵向排版（从上向下）"
          >
            <MoveVertical className="h-3.5 w-3.5" />
            <span className="hidden md:inline">纵向</span>
          </button>
        </div>

        {/* 全部展开/折叠 */}
        <button
          type="button"
          onClick={onToggleAll}
          className="flex h-8.5 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
        >
          {isAllExpanded ? (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              <span>全部折叠</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
              <span>全部展开</span>
            </>
          )}
        </button>

        {/* 居中视野 */}
        {onFitView && (
          <button
            type="button"
            onClick={onFitView}
            className="flex h-8.5 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
            title="居中自适应视野"
          >
            <Maximize2 className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden sm:inline">居中</span>
          </button>
        )}

        {/* 重置筛选与刷新 */}
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="flex h-8.5 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          title="重置视图与刷新"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">重置</span>
        </button>
      </div>
    </div>
  );
}
