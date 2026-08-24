'use client';

import React from 'react';
import { GanttItem } from './gantt-utils';
import { DbTask, NodeTreeNode } from '@/lib/types';
import {
  ChevronRight,
  ChevronDown,
  FolderTree,
  Folder,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Calendar,
  CalendarPlus,
} from 'lucide-react';

interface GanttLeftTreeProps {
  items: GanttItem[];
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  hoveredItemId: string | null;
  onHoverItem: (id: string | null) => void;
  onOpenTaskComments?: (task: DbTask) => void;
  onOpenNodeComments?: (node: NodeTreeNode) => void;
  onRequestSubmitDeliverable?: (task: DbTask) => void;
  onQuickScheduleTask?: (task: DbTask) => void;
}

export function GanttLeftTree({
  items,
  collapsedIds,
  onToggleCollapse,
  hoveredItemId,
  onHoverItem,
  onOpenTaskComments,
  onOpenNodeComments,
  onRequestSubmitDeliverable,
  onQuickScheduleTask,
}: GanttLeftTreeProps) {
  return (
    <div className="w-[340px] sm:w-[380px] shrink-0 border-r border-zinc-200 bg-white select-none">
      {/* 列表头部 */}
      <div className="flex h-14 items-center border-b border-zinc-200 bg-zinc-50/90 px-3 text-xs font-bold text-zinc-700">
        <div className="flex-1 truncate pl-2">WBS 结构 / 任务项</div>
        <div className="w-16 text-center shrink-0">负责人</div>
        <div className="w-14 text-center shrink-0">工期</div>
        <div className="w-14 text-right pr-2 shrink-0">进度</div>
      </div>

      {/* 列表项 */}
      <div className="divide-y divide-zinc-100">
        {items.map((item) => {
          const isCollapsed = collapsedIds.has(item.id);
          const isHovered = hoveredItemId === item.id;
          const isProject = item.type === 'project';
          const isNode = item.type === 'node';
          const isTask = item.type === 'task';
          const isUnscheduled = !!item.isUnscheduled;

          return (
            <div
              key={item.id}
              id={`gantt-left-row-${item.id}`}
              onMouseEnter={() => onHoverItem(item.id)}
              onMouseLeave={() => onHoverItem(null)}
              className={`flex h-11 items-center px-3 transition-colors ${
                isHovered
                  ? 'bg-blue-50/60'
                  : isProject
                  ? 'bg-zinc-50/60 font-semibold'
                  : isUnscheduled
                  ? 'bg-amber-50/30'
                  : 'hover:bg-zinc-50/50'
              }`}
            >
              {/* 左侧层级缩进与展开图标 */}
              <div
                className={`flex flex-1 items-center min-w-0 pr-2 ${item.hasChildren ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (item.hasChildren) {
                    onToggleCollapse(item.id);
                  }
                }}
                style={{ paddingLeft: `${item.depth * 14}px` }}
              >
                {item.hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapse(item.id);
                    }}
                    className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-800 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <div className="mr-1 w-5 shrink-0" />
                )}

                {/* 节点类型图标 */}
                {isProject ? (
                  <FolderTree className="mr-1.5 h-4 w-4 shrink-0 text-blue-600" />
                ) : isNode ? (
                  <Folder className="mr-1.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : item.status === 'done' ? (
                  <CheckCircle2 className="mr-1.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : isUnscheduled ? (
                  <Calendar className="mr-1.5 h-4 w-4 shrink-0 text-amber-500/90" />
                ) : item.isOverdue ? (
                  <AlertCircle className="mr-1.5 h-4 w-4 shrink-0 text-red-500 animate-pulse" />
                ) : (
                  <Clock className="mr-1.5 h-4 w-4 shrink-0 text-zinc-400" />
                )}

                {/* 名称与标签 */}
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span
                    className={`truncate text-xs ${
                      isProject
                        ? 'font-bold text-zinc-900'
                        : isNode
                        ? 'font-semibold text-zinc-800'
                        : item.status === 'done'
                        ? 'text-zinc-400 line-through'
                        : isUnscheduled
                        ? 'text-zinc-700'
                        : 'text-zinc-700'
                    }`}
                    title={item.name}
                  >
                    {item.name}
                  </span>

                  {isUnscheduled && isTask && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.originalTask && onQuickScheduleTask) {
                          onQuickScheduleTask(item.originalTask);
                        }
                      }}
                      className="shrink-0 flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 transition-colors"
                      title="点击快速设定截止排期"
                    >
                      <CalendarPlus className="h-2.5 w-2.5" />
                      <span>待排期</span>
                    </button>
                  )}

                  {item.priority && (
                    <span className="shrink-0 rounded bg-red-50 px-1 py-0.2 text-[9px] font-bold text-red-600 border border-red-100">
                      {item.priority}
                    </span>
                  )}

                  {item.hasDeliverable && (
                    <span
                      title={item.deliverableSubmitted ? '交付物已提交' : '待提交交付物'}
                      className={`shrink-0 flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-medium ${
                        item.deliverableSubmitted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}
                    >
                      <FileCheck2 className="h-2.5 w-2.5" />
                      <span>{item.deliverableSubmitted ? '已交' : '交付'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 负责人 */}
              <div className="w-16 text-center text-xs text-zinc-600 truncate shrink-0">
                {item.owner || '-'}
              </div>

              {/* 工期 */}
              <div className="w-14 text-center text-xs font-mono shrink-0">
                {isUnscheduled ? (
                  <span className="text-[10px] text-amber-600 font-medium">待排期</span>
                ) : (
                  <span className="text-zinc-500">{item.durationDays}天</span>
                )}
              </div>

              {/* 进度 */}
              <div className="w-14 text-right pr-2 text-xs font-mono shrink-0">
                <span
                  className={
                    item.progressPercent === 100
                      ? 'text-emerald-600 font-bold'
                      : item.progressPercent > 0
                      ? 'text-blue-600 font-medium'
                      : isUnscheduled
                      ? 'text-amber-500 font-medium'
                      : 'text-zinc-400'
                  }
                >
                  {isUnscheduled ? '未启动' : `${item.progressPercent}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
