'use client';

import React from 'react';
import { NodeTreeNode, ProjectStatus } from '@/lib/types';
import {
  AlertCircle,
  Clock,
  FolderGit2,
  ChevronLeft,
  ChevronDown,
  Edit2,
} from 'lucide-react';
import Link from 'next/link';

interface ProjectHeaderProps {
  tree: NodeTreeNode;
  onEditClick: () => void;
  onStatusChange: (status: ProjectStatus) => void;
}

export function ProjectHeader({ tree, onEditClick, onStatusChange }: ProjectHeaderProps) {
  return (
    <div
      id="project-detail-compact-header"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 sm:px-3 sm:py-1.5 shadow-2xs"
    >
      {/* 左侧：返回仪表盘 + 分隔符 + 项目名称 + 进度条与指标 + 预估周期 */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap text-[11px] sm:text-xs">
        <Link
          id="back-to-dashboard-btn"
          href="/"
          className="inline-flex items-center gap-0.5 font-semibold text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
          title="返回所有项目仪表盘"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">返回仪表盘</span>
        </Link>

        <span className="text-zinc-200 shrink-0">|</span>

        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <div className="flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded bg-zinc-900 text-emerald-400 shrink-0">
            <FolderGit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </div>
          <h1 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900 truncate max-w-[80px] xs:max-w-[120px] sm:max-w-xs">
            {tree.name}
          </h1>
        </div>

        {tree.hasOverdueTasks && (
          <span className="inline-flex items-center gap-0.5 rounded bg-red-50 border border-red-200/80 px-1 py-0.2 text-[9px] sm:text-[10px] font-semibold text-red-700 shrink-0">
            <AlertCircle className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-red-600" />
            延期 {tree.maxOverdueDays || 1}d
          </span>
        )}

        <span className="text-zinc-200 shrink-0 hidden md:inline">|</span>

        {/* 紧凑内联进度条 */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="h-1.5 w-10 sm:w-24 overflow-hidden rounded-full bg-zinc-100 border border-zinc-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tree.progressPercent === 100
                  ? 'bg-emerald-500'
                  : tree.hasOverdueTasks
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${tree.progressPercent}%` }}
            />
          </div>
          <span className="font-bold text-zinc-900 text-[10px] sm:text-xs">{tree.progressPercent}%</span>
          <span className="text-[9px] sm:text-[10px] text-zinc-400 hidden sm:inline">
            ({tree.completedTasksCount}/{tree.totalTasksCount})
          </span>
        </div>

        {tree.estimated_duration && (
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 shrink-0 hidden lg:flex">
            <Clock className="h-3 w-3 text-zinc-400" />
            <span>{tree.estimated_duration}</span>
          </div>
        )}
      </div>

      {/* 右侧：编辑信息与状态切换 */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t border-zinc-100 sm:border-t-0">
        <button
          onClick={onEditClick}
          className="inline-flex items-center gap-0.5 sm:gap-1 rounded bg-zinc-50/60 border border-zinc-200 px-1.5 sm:px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          <Edit2 className="h-3 w-3 text-zinc-500" />
          <span>编辑项目</span>
        </button>

        <div className="relative inline-flex items-center">
          <select
            aria-label="切换项目状态"
            value={tree.status}
            onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
            className={`appearance-none cursor-pointer rounded-md pl-3.5 pr-3.5 py-0.5 text-[11px] sm:text-xs font-semibold border transition-all focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-2xs ${
              tree.status === 'done'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80'
                : tree.status === 'in_progress'
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200/80'
            }`}
          >
            <option value="unstarted">未开始</option>
            <option value="in_progress">进行中</option>
            <option value="done">已完成</option>
          </select>

          <span
            className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${
              tree.status === 'done'
                ? 'bg-emerald-500'
                : tree.status === 'in_progress'
                ? 'bg-blue-500 animate-pulse'
                : 'bg-zinc-400'
            }`}
          />

          <ChevronDown
            className={`pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 ${
              tree.status === 'done'
                ? 'text-emerald-600'
                : tree.status === 'in_progress'
                ? 'text-blue-600'
                : 'text-zinc-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
