'use client';

import React, { useState, useMemo, useRef } from 'react';
import { NodeTreeNode, DbTask } from '@/lib/types';
import {
  GanttViewMode,
  flattenTreeToGanttItems,
  getGanttTimelineRange,
  generateTimelineDays,
  diffDays,
} from './gantt-utils';
import { GanttSummaryBar } from './GanttSummaryBar';
import { GanttLeftTree } from './GanttLeftTree';
import { GanttTimelineHeader } from './GanttTimelineHeader';
import { GanttTimelineCanvas } from './GanttTimelineCanvas';

interface GanttChartProps {
  tree: NodeTreeNode;
  hideCompleted: boolean;
  onOpenTaskComments?: (task: DbTask) => void;
  onOpenNodeComments?: (node: NodeTreeNode) => void;
  onRequestSubmitDeliverable?: (task: DbTask) => void;
}

export function GanttChart({
  tree,
  hideCompleted,
  onOpenTaskComments,
  onOpenNodeComments,
  onRequestSubmitDeliverable,
}: GanttChartProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<GanttViewMode>('day');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const rightScrollRef = useRef<HTMLDivElement>(null);

  // 1. 动态确定当前刻度宽度
  const columnWidth = useMemo(() => {
    switch (viewMode) {
      case 'week':
        return 28;
      case 'month':
        return 16;
      case 'day':
      default:
        return 38;
    }
  }, [viewMode]);

  // 2. 扁平化数据与依赖关系
  const { items, dependencies } = useMemo(() => {
    return flattenTreeToGanttItems(tree, collapsedIds, hideCompleted);
  }, [tree, collapsedIds, hideCompleted]);

  // 3. 计算全局时间轴范围
  const { minDate, totalDays } = useMemo(() => {
    return getGanttTimelineRange(items);
  }, [items]);

  // 4. 生成天数列
  const days = useMemo(() => {
    return generateTimelineDays(minDate, totalDays);
  }, [minDate, totalDays]);

  // 折叠 / 展开切换
  const handleToggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全部折叠 / 全部展开
  const isAllExpanded = collapsedIds.size === 0;
  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      // 收集所有具有子节点或子任务的 ID
      const allParentIds = new Set<string>();
      function collectIds(n: NodeTreeNode) {
        if ((n.children && n.children.length > 0) || (n.tasks && n.tasks.length > 0)) {
          allParentIds.add(n.id);
        }
        n.children?.forEach(collectIds);
      }
      collectIds(tree);
      setCollapsedIds(allParentIds);
    } else {
      setCollapsedIds(new Set());
    }
  };

  // 定位今天
  const handleScrollToToday = () => {
    const todayIdx = days.findIndex((d) => d.isToday);
    if (todayIdx >= 0 && rightScrollRef.current) {
      const targetScrollLeft = Math.max(0, todayIdx * columnWidth - 200);
      rightScrollRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  const projectItem = items.find((it) => it.type === 'project');

  return (
    <div className="space-y-4">
      {/* 顶部老板 KPI 指标栏与视图控制 */}
      <GanttSummaryBar
        items={items}
        projectItem={projectItem}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onScrollToToday={handleScrollToToday}
        isAllExpanded={isAllExpanded}
        onToggleExpandAll={handleToggleExpandAll}
      />

      {/* 主甘特图区域：左侧 WBS 列表 + 右侧时间网格 Canvas */}
      <div className="rounded-xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
        <div className="flex w-full overflow-hidden">
          {/* 左侧固定 WBS 结构列 */}
          <GanttLeftTree
            items={items}
            collapsedIds={collapsedIds}
            onToggleCollapse={handleToggleCollapse}
            hoveredItemId={hoveredItemId}
            onHoverItem={setHoveredItemId}
            onOpenTaskComments={onOpenTaskComments}
            onOpenNodeComments={onOpenNodeComments}
            onRequestSubmitDeliverable={onRequestSubmitDeliverable}
          />

          {/* 右侧水平滚动时间轴画布 */}
          <div ref={rightScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
            <GanttTimelineHeader days={days} columnWidth={columnWidth} viewMode={viewMode} />
            <GanttTimelineCanvas
              items={items}
              days={days}
              dependencies={dependencies}
              minDate={minDate}
              columnWidth={columnWidth}
              hoveredItemId={hoveredItemId}
              onHoverItem={setHoveredItemId}
              onOpenTaskComments={onOpenTaskComments}
              onOpenNodeComments={onOpenNodeComments}
              onRequestSubmitDeliverable={onRequestSubmitDeliverable}
            />
          </div>
        </div>

        {/* 底部图例说明说明栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-150 bg-zinc-50/70 px-4 py-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-zinc-700">图例指示:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-xs bg-zinc-800" />
              <span>阶段汇总跨度</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-xs bg-blue-600" />
              <span>推进中任务</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-xs bg-emerald-500" />
              <span>已完成任务</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-xs bg-red-500" />
              <span>延期风险节点</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 border-b border-dashed border-slate-400" />
              <span>前后序依赖流向</span>
            </div>
          </div>
          <span>支持左右滚动查看完整项目生命周期</span>
        </div>
      </div>
    </div>
  );
}
