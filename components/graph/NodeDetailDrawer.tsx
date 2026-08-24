'use client';

import React from 'react';
import Link from 'next/link';
import { X, ExternalLink, User, Calendar, CheckCircle2, AlertTriangle, Paperclip, Clock, ShieldCheck, Layers, FileText } from 'lucide-react';
import { NodeTreeNode, DbTask, DashboardMetrics } from '@/lib/types';

interface NodeDetailDrawerProps {
  selectedNode: {
    id: string;
    type: 'root' | 'project' | 'module' | 'task';
    data: any;
  } | null;
  onClose: () => void;
  onToggleTask: (taskId: string, currentStatus: string) => void;
}

export function NodeDetailDrawer({
  selectedNode,
  onClose,
  onToggleTask,
}: NodeDetailDrawerProps) {
  if (!selectedNode) return null;

  const { type, data } = selectedNode;

  return (
    <aside
      aria-label="节点详情"
      className="absolute right-4 top-20 z-20 w-80 sm:w-96 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-200 max-h-[calc(100vh-120px)] flex flex-col"
    >
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
            {type === 'root' && '全局总览'}
            {type === 'project' && '项目详情'}
            {type === 'module' && '模块/阶段'}
            {type === 'task' && '具体任务'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 抽屉主体内容 */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1">
        {/* 1. 根节点详情 */}
        {type === 'root' && (
          <div className="space-y-3.5">
            <div>
              <h3 className="font-bold text-zinc-900 text-base">项目进度管理总览</h3>
              <p className="text-xs text-zinc-500 mt-0.5">全系统各研发与交付项目全局健康拓扑</p>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">综合平均进度</span>
                <span className="font-bold text-emerald-600">{(data as DashboardMetrics)?.averageProgress}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">项目总数</span>
                <span className="font-semibold text-zinc-800">{(data as DashboardMetrics)?.totalProjects} 个</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">进行中项目</span>
                <span className="font-semibold text-blue-600">{(data as DashboardMetrics)?.inProgressCount} 个</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">已完成项目</span>
                <span className="font-semibold text-emerald-600">{(data as DashboardMetrics)?.doneCount} 个</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">超期风险项目</span>
                <span className="font-semibold text-rose-600">{(data as DashboardMetrics)?.overdueProjectsCount} 个</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. 项目节点详情 */}
        {type === 'project' && (
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-700">
                  {(data as NodeTreeNode).priority || 'P1'}
                </span>
                <span className="text-xs font-medium text-zinc-500">
                  状态: {(data as NodeTreeNode).status}
                </span>
              </div>
              <h3 className="font-bold text-zinc-900 text-base leading-snug">
                {(data as NodeTreeNode).name}
              </h3>
              {(data as NodeTreeNode).description && (
                <p className="text-xs text-zinc-600 mt-1">{(data as NodeTreeNode).description}</p>
              )}
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">负责人</span>
                <span className="font-medium text-zinc-800">{(data as NodeTreeNode).owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">任务完成度</span>
                <span className="font-bold text-zinc-900">
                  {(data as NodeTreeNode).completedTasksCount} / {(data as NodeTreeNode).totalTasksCount} (
                  {(data as NodeTreeNode).progressPercent}%)
                </span>
              </div>
              {(data as NodeTreeNode).latestDueDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">计划交付日</span>
                  <span className="font-medium text-zinc-800">{(data as NodeTreeNode).latestDueDate}</span>
                </div>
              )}
              {(data as NodeTreeNode).hasOverdueTasks && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>超期告警</span>
                  <span>逾期 {(data as NodeTreeNode).maxOverdueDays} 天</span>
                </div>
              )}
            </div>

            <Link
              href={`/projects/${(data as NodeTreeNode).id}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>打开完整项目看板</span>
            </Link>
          </div>
        )}

        {/* 3. 模块节点详情 */}
        {type === 'module' && (
          <div className="space-y-3.5">
            <div>
              <h3 className="font-bold text-zinc-900 text-base leading-snug">
                {(data as NodeTreeNode).name}
              </h3>
              {(data as NodeTreeNode).description && (
                <p className="text-xs text-zinc-600 mt-1">{(data as NodeTreeNode).description}</p>
              )}
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">负责人</span>
                <span className="font-medium text-zinc-800">{(data as NodeTreeNode).owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">预计工期</span>
                <span className="font-medium text-zinc-800">{(data as NodeTreeNode).estimated_duration || '未设定'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">任务进度</span>
                <span className="font-bold text-zinc-900">
                  {(data as NodeTreeNode).completedTasksCount} / {(data as NodeTreeNode).totalTasksCount} (
                  {(data as NodeTreeNode).progressPercent}%)
                </span>
              </div>
            </div>

            {/* 模块直属任务清单 */}
            {(data as NodeTreeNode).tasks && (data as NodeTreeNode).tasks.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-zinc-700 mb-2">包含任务 ({(data as NodeTreeNode).tasks.length})</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(data as NodeTreeNode).tasks.map((t: DbTask) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded border border-zinc-100 bg-zinc-50/50 p-2 text-xs"
                    >
                      <span className={`truncate ${t.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                        {t.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleTask(t.id, t.status)}
                        className={`text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                          t.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                        }`}
                      >
                        {t.status === 'done' ? '已完成' : '勾选完成'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. 任务节点详情 */}
        {type === 'task' && (
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    (data as DbTask).status === 'done'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {(data as DbTask).status === 'done' ? '已完成' : '待办进行中'}
                </span>
              </div>
              <h3 className="font-bold text-zinc-900 text-base leading-snug">
                {(data as DbTask).name}
              </h3>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">执行人</span>
                <span className="font-medium text-zinc-800">{(data as DbTask).owner}</span>
              </div>
              {(data as DbTask).due_date && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">截止日期</span>
                  <span className="font-medium text-zinc-800">{(data as DbTask).due_date}</span>
                </div>
              )}
              {(data as DbTask).estimated_duration && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">预估工期</span>
                  <span className="font-medium text-zinc-800">{(data as DbTask).estimated_duration}</span>
                </div>
              )}
              {(data as DbTask).done_at && (
                <div className="flex justify-between text-emerald-700">
                  <span>完成时间</span>
                  <span>{(data as DbTask).done_at}</span>
                </div>
              )}
            </div>

            {/* 交付件信息 */}
            {((data as DbTask).has_deliverable || ((data as DbTask).deliverable_items && (data as DbTask).deliverable_items!.length > 0)) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1 font-semibold text-amber-900">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>交付件要求</span>
                </div>
                {(data as DbTask).deliverable_requirement && (
                  <p className="text-amber-800 text-[11px]">{(data as DbTask).deliverable_requirement}</p>
                )}
                {(data as DbTask).deliverable_submission && (
                  <div className="mt-1 border-t border-amber-200/60 pt-1 text-[11px]">
                    <span className="text-amber-700 font-medium">提交记录: </span>
                    <span className="text-zinc-800">{(data as DbTask).deliverable_submission}</span>
                  </div>
                )}
              </div>
            )}

            {/* 切换完成状态按钮 */}
            <button
              type="button"
              onClick={() => onToggleTask((data as DbTask).id, (data as DbTask).status)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold shadow-xs transition-colors ${
                (data as DbTask).status === 'done'
                  ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{(data as DbTask).status === 'done' ? '标记为待办' : '极简勾选完成'}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
