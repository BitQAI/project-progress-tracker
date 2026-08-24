'use client';

import React from 'react';
import { GanttViewMode } from './gantt-utils';

interface TimelineDay {
  dateStr: string;
  dayNumber: number;
  weekDay: string;
  isToday: boolean;
  isWeekend: boolean;
  monthStr: string;
}

interface GanttTimelineHeaderProps {
  days: TimelineDay[];
  columnWidth: number;
  viewMode: GanttViewMode;
}

export function GanttTimelineHeader({ days, columnWidth, viewMode }: GanttTimelineHeaderProps) {
  const totalWidth = days.length * columnWidth;

  // 按月份分组计算跨度
  const monthGroups: { monthStr: string; startIndex: number; count: number }[] = [];
  days.forEach((day, index) => {
    const lastGroup = monthGroups[monthGroups.length - 1];
    if (!lastGroup || lastGroup.monthStr !== day.monthStr) {
      monthGroups.push({
        monthStr: day.monthStr,
        startIndex: index,
        count: 1,
      });
    } else {
      lastGroup.count += 1;
    }
  });

  return (
    <div
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
      className="sticky top-0 z-20 flex flex-col border-b border-zinc-200 bg-zinc-50 select-none shadow-2xs shrink-0"
    >
      {/* 顶部月份层 */}
      <div className="flex h-7 border-b border-zinc-200/80 bg-zinc-100/70 text-xs font-semibold text-zinc-700">
        {monthGroups.map((group, idx) => (
          <div
            key={idx}
            style={{ width: `${group.count * columnWidth}px` }}
            className="shrink-0 flex items-center px-2.5 border-r border-zinc-200/60 truncate"
          >
            <span className="truncate">{group.monthStr}</span>
          </div>
        ))}
      </div>

      {/* 底部日/刻度层 */}
      <div className="flex h-7 text-[11px] font-medium text-zinc-600">
        {days.map((day, idx) => {
          return (
            <div
              key={idx}
              style={{ width: `${columnWidth}px` }}
              className={`shrink-0 flex flex-col items-center justify-center border-r border-zinc-150 transition-colors ${
                day.isToday
                  ? 'bg-blue-50/90 font-bold text-blue-700'
                  : day.isWeekend
                  ? 'bg-zinc-100/40 text-zinc-400'
                  : 'text-zinc-600'
              }`}
              title={`${day.dateStr} (${day.weekDay})`}
            >
              {viewMode === 'day' ? (
                <div className="flex items-center gap-0.5">
                  <span className="text-[11px]">{day.dayNumber}</span>
                  <span className="text-[9px] text-zinc-400 font-normal">周{day.weekDay}</span>
                </div>
              ) : viewMode === 'week' ? (
                <span className="text-[10px]">{day.dayNumber}</span>
              ) : (
                <span className="text-[9px]">
                  {day.dayNumber % 5 === 0 || day.dayNumber === 1 ? day.dayNumber : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
