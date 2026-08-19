'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ProjectSummary, ProjectStatus, ProjectPriority } from '@/lib/types';
import {
  Search,
  ArrowUpRight,
  AlertCircle,
  Calendar,
  User,
  Trash2,
  ListTree,
  Filter,
  ChevronDown,
  Clock,
} from 'lucide-react';

interface ProjectListTableProps {
  projects: ProjectSummary[];
  onDeleteProject: (id: string, name: string) => void;
  onStatusChange: (id: string, newStatus: ProjectStatus) => void;
}

export function ProjectListTable({
  projects,
  onDeleteProject,
  onStatusChange,
}: ProjectListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.owner.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'overdue') return p.isOverdue;
      return p.status === statusFilter;
    });
  }, [projects, searchTerm, statusFilter]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-xs">
      {/* 搜索与过滤工具条 */}
      <div className="flex flex-col gap-3 border-b border-zinc-150 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="search-project-input"
            type="text"
            placeholder="搜索项目名称、负责人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 text-zinc-400 hidden sm:inline" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            全部 ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            进行中
          </button>
          <button
            onClick={() => setStatusFilter('overdue')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'overdue'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            超期预警
          </button>
          <button
            onClick={() => setStatusFilter('done')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'done'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            已完成
          </button>
          <button
            onClick={() => setStatusFilter('unstarted')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'unstarted'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            未开始
          </button>
        </div>
      </div>

      {/* 项目列表表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm" aria-label="项目进度列表">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
            <tr>
              <th scope="col" className="px-4 py-2.5">项目名称</th>
              <th scope="col" className="px-3 py-2.5">优先级</th>
              <th scope="col" className="px-3 py-2.5">负责人</th>
              <th scope="col" className="px-3 py-2.5 min-w-[180px]">进度 (递归汇总)</th>
              <th scope="col" className="px-3 py-2.5">状态</th>
              <th scope="col" className="px-3 py-2.5">计划截止日</th>
              <th scope="col" className="px-4 py-2.5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ListTree className="h-8 w-8 text-zinc-300" />
                    <p className="text-xs">未检索到匹配的项目</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  id={`project-row-${project.id}`}
                  className="group hover:bg-zinc-50/80 transition-colors"
                >
                  {/* 项目名（精简单行呈现：项目名 + 超期预警 + 预计时间 + 提前时间） */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold text-zinc-900 hover:text-blue-600 hover:underline inline-flex items-center gap-1 text-xs sm:text-sm shrink-0"
                      >
                        <span className="truncate max-w-[220px] sm:max-w-xs">{project.name}</span>
                        <ArrowUpRight className="h-3 w-3 text-zinc-400 group-hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
                      </Link>

                      {project.isOverdue && (
                        <span
                          id={`overdue-badge-${project.id}`}
                          className="inline-flex items-center gap-0.5 rounded bg-red-100 border border-red-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-red-700 shrink-0"
                          title={`包含 ${project.overdueTasksCount} 个超期任务，最长已延期 ${project.maxOverdueDays || 1} 天`}
                        >
                          <AlertCircle className="h-2.5 w-2.5 text-red-600" />
                          延期: {project.maxOverdueDays || 1}天
                        </span>
                      )}

                      {/* 耗时（已打勾完成任务的预计周期 - 提前时间） */}
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-700 shrink-0 border border-zinc-200/70">
                        <Clock className="h-2.5 w-2.5 text-zinc-400" />
                        耗时: {project.spentTimeDisplay || '0天'}
                      </span>

                      {/* 提前时间 */}
                      {project.earlyDays && project.earlyDays > 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 shrink-0">
                          提前: {project.earlyDays}天
                        </span>
                      ) : project.status === 'done' && !project.isOverdue ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 text-[10px] font-medium text-blue-700 shrink-0">
                          按期交付
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* 优先级 */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {project.priority === 'P0' ? (
                      <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 shadow-2xs">
                        P0 紧急
                      </span>
                    ) : project.priority === 'P1' ? (
                      <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-2xs">
                        P1 高
                      </span>
                    ) : project.priority === 'P2' ? (
                      <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50/60 px-2 py-0.5 text-[10px] font-medium text-blue-700 shadow-2xs">
                        P2 中
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-normal text-zinc-500">
                        P3 低
                      </span>
                    )}
                  </td>

                  {/* 负责人 */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-zinc-700">
                      <User className="h-3 w-3 text-zinc-400" />
                      <span className="font-medium text-xs">{project.owner}</span>
                    </div>
                  </td>

                  {/* 进度 */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-zinc-900">{project.progress}%</span>
                        <span className="text-zinc-500 text-[10px]">
                          {project.completedTasks}/{project.totalTasks} 任务
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            project.progress === 100
                              ? 'bg-emerald-500'
                              : project.isOverdue
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 状态 (一体化交互状态胶囊) */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="relative inline-flex items-center">
                      <select
                        id={`select-status-${project.id}`}
                        aria-label={`修改项目 ${project.name} 状态`}
                        value={project.status}
                        onChange={(e) => onStatusChange(project.id, e.target.value as ProjectStatus)}
                        className={`appearance-none cursor-pointer rounded-full pl-5 pr-6 py-0.5 text-[11px] font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs ${
                          project.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80'
                            : project.status === 'in_progress'
                            ? project.isOverdue
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200/80'
                        }`}
                      >
                        <option value="unstarted">未开始</option>
                        <option value="in_progress">
                          {project.isOverdue ? '超期进行中' : '进行中'}
                        </option>
                        <option value="done">已完成</option>
                      </select>

                      {/* 状态呼吸指示点 */}
                      <span
                        className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${
                          project.status === 'done'
                            ? 'bg-emerald-500'
                            : project.status === 'in_progress'
                            ? project.isOverdue
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-blue-500 animate-pulse'
                            : 'bg-zinc-400'
                        }`}
                      />

                      {/* 下拉箭头标识 */}
                      <ChevronDown
                        className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 ${
                          project.status === 'done'
                            ? 'text-emerald-600'
                            : project.status === 'in_progress'
                            ? project.isOverdue
                              ? 'text-amber-700'
                              : 'text-blue-600'
                            : 'text-zinc-500'
                        }`}
                      />
                    </div>
                  </td>

                  {/* 计划截止日 */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-xs text-zinc-600">
                      <Calendar className="h-3 w-3 text-zinc-400" />
                      <span>{project.latestDueDate || '— (未排期)'}</span>
                    </div>
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/projects/${project.id}`}
                        id={`btn-open-project-${project.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                      >
                        <ListTree className="h-3 w-3" />
                        <span>详情</span>
                      </Link>
                      <button
                        id={`btn-delete-project-${project.id}`}
                        onClick={() => onDeleteProject(project.id, project.name)}
                        className="inline-flex items-center justify-center rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="删除项目"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
