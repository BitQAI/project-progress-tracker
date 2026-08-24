'use client';

import React, { useState } from 'react';
import { GanttItem, GanttDependency, diffDays } from './gantt-utils';
import { DbTask, NodeTreeNode } from '@/lib/types';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface TimelineDay {
  dateStr: string;
  dayNumber: number;
  weekDay: string;
  isToday: boolean;
  isWeekend: boolean;
  monthStr: string;
}

interface GanttTimelineCanvasProps {
  items: GanttItem[];
  days: TimelineDay[];
  dependencies: GanttDependency[];
  minDate: string;
  columnWidth: number;
  hoveredItemId: string | null;
  onHoverItem: (id: string | null) => void;
  onOpenTaskComments?: (task: DbTask) => void;
  onOpenNodeComments?: (node: NodeTreeNode) => void;
  onRequestSubmitDeliverable?: (task: DbTask) => void;
  onQuickScheduleTask?: (task: DbTask) => void;
}

const ROW_HEIGHT = 44; // 与左侧列表行高保持严格一致 44px (h-11)

export function GanttTimelineCanvas({
  items,
  days,
  dependencies,
  minDate,
  columnWidth,
  hoveredItemId,
  onHoverItem,
  onOpenTaskComments,
  onOpenNodeComments,
  onRequestSubmitDeliverable,
  onQuickScheduleTask,
}: GanttTimelineCanvasProps) {
  const [activeTooltip, setActiveTooltip] = useState<{
    item: GanttItem;
    x: number;
    y: number;
  } | null>(null);

  const totalWidth = days.length * columnWidth;
  const totalHeight = items.length * ROW_HEIGHT;

  // 今天所在的 X 坐标
  const todayIndex = days.findIndex((d) => d.isToday);
  const todayX = todayIndex >= 0 ? todayIndex * columnWidth + columnWidth / 2 : -1;

  // 计算每个 item 在画布上的几何坐标 (x, width, y)
  const itemCoordinates = new Map<
    string,
    { x: number; width: number; y: number; centerY: number; rightX: number }
  >();

  items.forEach((item, index) => {
    const startOffsetDays = diffDays(minDate, item.startDate);
    const durationDays = Math.max(1, diffDays(item.startDate, item.dueDate) + 1);

    const x = Math.max(0, startOffsetDays * columnWidth);
    const width = Math.max(columnWidth * 0.8, durationDays * columnWidth);
    const y = index * ROW_HEIGHT;
    const centerY = y + ROW_HEIGHT / 2;
    const rightX = x + width;

    itemCoordinates.set(item.id, { x, width, y, centerY, rightX });
  });

  return (
    <div
      style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}
      className="relative bg-white select-none overflow-visible"
    >
      {/* 1. 背景网格列 (Days/Weekends) */}
      <div className="absolute inset-0 flex pointer-events-none">
        {days.map((day, idx) => (
          <div
            key={idx}
            style={{ width: `${columnWidth}px` }}
            className={`h-full border-r border-zinc-150 ${
              day.isToday ? 'bg-blue-50/20' : day.isWeekend ? 'bg-zinc-50/60' : ''
            }`}
          />
        ))}
      </div>

      {/* 2. 背景行分割线 */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{ height: `${ROW_HEIGHT}px` }}
            className={`w-full border-b border-zinc-100 ${
              hoveredItemId === item.id ? 'bg-blue-50/40' : ''
            }`}
          />
        ))}
      </div>

      {/* 3. 今天垂直时间指示线 (Today line) */}
      {todayX >= 0 && (
        <div
          style={{ left: `${todayX}px` }}
          className="absolute top-0 bottom-0 z-10 w-[2px] bg-blue-500/80 pointer-events-none shadow-sm"
        >
          <div className="sticky top-0 -ml-5 flex items-center justify-center rounded-b bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
            今天
          </div>
        </div>
      )}

      {/* 4. SVG 依赖连线层 (Dependencies Connections) */}
      <svg
        style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}
        className="absolute inset-0 pointer-events-none z-10"
      >
        <defs>
          <marker
            id="gantt-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
          </marker>
          <marker
            id="gantt-arrow-active"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
          </marker>
        </defs>

        {dependencies.map((dep, idx) => {
          const fromCoord = itemCoordinates.get(dep.fromId);
          const toCoord = itemCoordinates.get(dep.toId);
          if (!fromCoord || !toCoord) return null;

          const isHighlight = hoveredItemId === dep.fromId || hoveredItemId === dep.toId;
          const startX = fromCoord.rightX;
          const startY = fromCoord.centerY;
          const endX = toCoord.x;
          const endY = toCoord.centerY;

          // 绘制平滑的拐角路径
          const midX = startX + Math.max(10, (endX - startX) / 2);
          const pathD = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;

          return (
            <path
              key={idx}
              d={pathD}
              fill="none"
              stroke={isHighlight ? '#3b82f6' : '#cbd5e1'}
              strokeWidth={isHighlight ? 2 : 1.2}
              strokeDasharray={isHighlight ? 'none' : '3 2'}
              markerEnd={isHighlight ? 'url(#gantt-arrow-active)' : 'url(#gantt-arrow)'}
              className="transition-colors"
            />
          );
        })}
      </svg>

      {/* 5. 甘特条 (Gantt Bars) */}
      <div className="absolute inset-0 z-10">
        {items.map((item) => {
          const coord = itemCoordinates.get(item.id);
          if (!coord) return null;

          const isHovered = hoveredItemId === item.id;
          const isProject = item.type === 'project';
          const isNode = item.type === 'node';
          const isTask = item.type === 'task';

          return (
            <div
              key={item.id}
              id={`gantt-bar-${item.id}`}
              style={{
                left: `${coord.x}px`,
                top: `${coord.y + (isTask ? 8 : 10)}px`,
                width: `${Math.max(20, coord.width)}px`,
                height: `${isTask ? 28 : 24}px`,
              }}
              onMouseEnter={(e) => {
                onHoverItem(item.id);
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({
                  item,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                });
              }}
              onMouseLeave={() => {
                onHoverItem(null);
                setActiveTooltip(null);
              }}
              onClick={() => {
                if (isTask && item.originalTask) {
                  if (item.isUnscheduled && onQuickScheduleTask) {
                    onQuickScheduleTask(item.originalTask);
                  } else if (item.hasDeliverable && !item.deliverableSubmitted && onRequestSubmitDeliverable) {
                    onRequestSubmitDeliverable(item.originalTask);
                  } else if (onOpenTaskComments) {
                    onOpenTaskComments(item.originalTask);
                  }
                } else if (isNode && item.originalNode && onOpenNodeComments) {
                  onOpenNodeComments(item.originalNode);
                }
              }}
              className={`absolute cursor-pointer transition-all duration-150 ${
                isHovered ? 'ring-2 ring-blue-500 ring-offset-1 z-30 scale-[1.01]' : 'z-20'
              }`}
            >
              {/* 阶段/项目 聚合汇总条 (Summary Bracket Bar) */}
              {isProject || isNode ? (
                <div className="relative h-full w-full">
                  <div
                    className={`h-3 w-full rounded-sm shadow-xs ${
                      isProject
                        ? 'bg-zinc-800 border border-zinc-900'
                        : 'bg-zinc-600 border border-zinc-700'
                    }`}
                  >
                    {/* 进度填充 */}
                    <div
                      className="h-full bg-emerald-500 rounded-sm"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                  {/* 两侧端点小三角形 */}
                  <div className="absolute -left-1 top-0 h-0 w-0 border-x-4 border-x-transparent border-t-[8px] border-t-zinc-800" />
                  <div className="absolute -right-1 top-0 h-0 w-0 border-x-4 border-x-transparent border-t-[8px] border-t-zinc-800" />
                  {/* 标签文字 */}
                  <span className="absolute left-1.5 -top-3.5 text-[10px] font-semibold text-zinc-700 truncate max-w-full">
                    {item.name} ({item.progressPercent}%)
                  </span>
                </div>
              ) : item.isUnscheduled ? (
                /* 方案 A：待排期占位虚线胶囊 (Unscheduled Striped Capsule) */
                <div
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, rgba(254, 243, 199, 0.75), rgba(254, 243, 199, 0.75) 6px, rgba(253, 230, 138, 0.6) 6px, rgba(253, 230, 138, 0.6) 12px)',
                  }}
                  className="group relative flex h-full w-full items-center justify-between overflow-hidden rounded-md border-2 border-dashed border-amber-400/90 px-2 text-amber-900 shadow-2xs transition-all hover:border-amber-500 hover:shadow-xs"
                >
                  <div className="relative z-10 flex items-center gap-1 min-w-0 truncate font-medium">
                    <Clock className="h-3 w-3 shrink-0 text-amber-600 animate-pulse" />
                    <span className="truncate text-[11px]">
                      {item.name}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center gap-1 text-[10px] shrink-0 font-semibold text-amber-700 bg-amber-200/80 px-1 py-0.2 rounded">
                    <span>待排期</span>
                  </div>
                </div>
              ) : (
                /* 正常叶子任务条 (Standard Task Bar) */
                <div
                  className={`group relative flex h-full w-full items-center justify-between overflow-hidden rounded-md px-2 shadow-xs transition-colors ${
                    item.status === 'done'
                      ? 'bg-emerald-500 text-white border border-emerald-600'
                      : item.isOverdue
                      ? 'bg-red-500 text-white border border-red-600'
                      : 'bg-blue-600 text-white border border-blue-700'
                  }`}
                >
                  {/* 任务内部进度填充条 */}
                  {item.status === 'done' && (
                    <div className="absolute inset-0 bg-emerald-600 opacity-30" />
                  )}

                  <div className="relative z-10 flex items-center gap-1 min-w-0 truncate">
                    {item.status === 'done' ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                    ) : item.isOverdue ? (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-200 animate-pulse" />
                    ) : null}
                    <span className="truncate text-[11px] font-medium">{item.name}</span>
                  </div>

                  <div className="relative z-10 flex items-center gap-1 text-[10px] shrink-0 opacity-90">
                    {item.hasDeliverable && (
                      <FileCheck2
                        className={`h-3 w-3 ${
                          item.deliverableSubmitted ? 'text-emerald-100' : 'text-amber-200'
                        }`}
                      />
                    )}
                    <span>{item.durationDays}d</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 6. 浮动悬浮卡片 (Gantt Bar Tooltip) */}
      {activeTooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${activeTooltip.x}px`,
            top: `${activeTooltip.y - 12}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="pointer-events-none z-50 w-72 rounded-xl border border-zinc-200 bg-zinc-900/95 p-3 text-white shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2">
            <div>
              <span className="inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300">
                {activeTooltip.item.type === 'project'
                  ? '项目总览'
                  : activeTooltip.item.type === 'node'
                  ? '阶段分组'
                  : activeTooltip.item.isUnscheduled
                  ? '待排期规划项'
                  : '任务项'}
              </span>
              <h4 className="mt-1 text-xs font-bold text-white line-clamp-2">
                {activeTooltip.item.name}
              </h4>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                activeTooltip.item.status === 'done'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : activeTooltip.item.isUnscheduled
                  ? 'bg-amber-500/20 text-amber-300'
                  : activeTooltip.item.isOverdue
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-blue-500/20 text-blue-300'
              }`}
            >
              {activeTooltip.item.status === 'done'
                ? '已完成'
                : activeTooltip.item.isUnscheduled
                ? '待排期'
                : activeTooltip.item.isOverdue
                ? '已逾期'
                : '推进中'}
            </span>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px] text-zinc-300">
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-zinc-400" />
              <span>负责人: {activeTooltip.item.owner || '未指派'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Calendar className="h-3 w-3 text-zinc-400" />
              <span>
                {activeTooltip.item.isUnscheduled
                  ? '排期时间: 尚未设定截止日 (待定)'
                  : `${activeTooltip.item.startDate} ~ ${activeTooltip.item.dueDate}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-zinc-400" />
              <span>
                {activeTooltip.item.isUnscheduled
                  ? '预估参考工期: 待启动排期'
                  : `周期工期: ${activeTooltip.item.durationDays} 天 (进度 ${activeTooltip.item.progressPercent}%)`}
              </span>
            </div>

            {activeTooltip.item.isOverdue && (
              <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                <AlertTriangle className="h-3 w-3" />
                <span>逾期滞后: {activeTooltip.item.overdueDays} 天</span>
              </div>
            )}

            {activeTooltip.item.hasDeliverable && (
              <div className="flex items-center gap-1.5 text-indigo-300">
                <FileCheck2 className="h-3 w-3" />
                <span>
                  交付物状态:{' '}
                  {activeTooltip.item.deliverableSubmitted ? '已提交证据链' : '待提交交付物'}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2.5 border-t border-zinc-800 pt-1.5 text-right text-[10px] text-zinc-400">
            {activeTooltip.item.isUnscheduled
              ? '⚡ 点击此条可快速设定截止日期与工期'
              : '点击直接唤起证据链与进度备注'}
          </div>
        </div>
      )}
    </div>
  );
}
