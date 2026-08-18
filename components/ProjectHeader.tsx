'use client';

import React from 'react';
import { NodeTreeNode, ProjectStatus } from '@/lib/types';
import {
  Calendar,
  User,
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
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" />
          返回所有项目仪表盘
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={onEditClick}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <Edit2 className="h-3 w-3 text-zinc-500" />
            <span>编辑项目信息</span>
          </button>
          <div className="relative inline-flex items-center ml-2">
            <select
              aria-label="切换项目状态"
              value={tree.status}
              onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
              className={`appearance-none cursor-pointer rounded-full pl-6 pr-7 py-1 text-xs font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs ${
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

            {/* 状态呼吸指示点 */}
            <span
              className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${
                tree.status === 'done'
                  ? 'bg-emerald-500'
                  : tree.status === 'in_progress'
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-zinc-400'
              }`}
            />

            {/* 下拉箭头标识 */}
            <ChevronDown
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs shrink-0">
            <FolderGit2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">{tree.name}</h1>
              {tree.estimated_duration && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 border border-zinc-200">
                  <Clock className="h-3 w-3 text-zinc-500" />
                  预估周期: {tree.estimated_duration}
                </span>
              )}
              {tree.hasOverdueTasks && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                  存在超期任务
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                负责人: <strong className="text-zinc-700">{tree.owner}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                计划截止: <strong className="text-zinc-700">{tree.latestDueDate || '未指定'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                创建于: {tree.created_at.split('T')[0]}
              </span>
            </div>
            {tree.description && (
              <div className="mt-2 text-xs text-zinc-600 max-w-3xl leading-relaxed whitespace-pre-wrap font-sans bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-150">
                {tree.description}
              </div>
            )}
          </div>
        </div>

        {/* 全局汇总大进度 */}
        <div className="flex items-center gap-4 bg-zinc-50 rounded-xl p-3 border border-zinc-150 min-w-[240px] shrink-0">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-700">全局进度 (汇总)</span>
              <span className="font-bold text-zinc-900">{tree.progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
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
            <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
              <span>已完成 {tree.completedTasksCount} 项</span>
              <span>共 {tree.totalTasksCount} 个任务</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
