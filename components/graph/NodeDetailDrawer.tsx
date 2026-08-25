'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  ExternalLink,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Clock,
  ShieldCheck,
  Layers,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Bot,
  ChevronLeft,
  MessageSquare
} from 'lucide-react';
import { NodeTreeNode, DbTask, DashboardMetrics } from '@/lib/types';
import { AddTaskForm, AddSubNodeForm, EditSubNodeForm } from '@/components/NodeActionForms';
import { TaskEditForm } from '@/components/TaskEditForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AiTextParseModal } from '@/components/ai-parse/AiTextParseModal';
import { EditProjectModal } from '@/components/EditProjectModal';
import { safeFetchJson } from '@/lib/fetch-utils';

interface NodeDetailDrawerProps {
  selectedNode: {
    id: string;
    type: 'root' | 'project' | 'module' | 'task';
    data: any;
    projectId?: string;
  } | null;
  onClose: () => void;
  onToggleTask: (taskId: string, currentStatus: string) => void;
  onRefreshData?: () => void;
  onOpenComments?: (target: { nodeId?: string; taskId?: string; title: string; subtitle: string }) => void;
}

export function NodeDetailDrawer({
  selectedNode,
  onClose,
  onToggleTask,
  onRefreshData,
  onOpenComments,
}: NodeDetailDrawerProps) {
  const [action, setAction] = React.useState<'view' | 'add_sub_node' | 'add_task' | 'edit' | 'delete_confirm'>('view');
  const [prevId, setPrevId] = React.useState<string | null>(null);

  if (!selectedNode) return null;

  if (selectedNode.id !== prevId) {
    setPrevId(selectedNode.id);
    setAction('view');
  }

  const { type, data } = selectedNode;


  return (
    <aside
      aria-label="节点详情"
      className="absolute right-4 top-4 bottom-4 z-20 w-80 sm:w-96 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-200 flex flex-col overflow-hidden"
    >
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          {action === 'view' ? (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
              {type === 'root' && '全局总览'}
              {type === 'project' && '项目详情'}
              {type === 'module' && '模块/阶段'}
              {type === 'task' && '具体任务'}
            </span>
          ) : (
            <button
              onClick={() => setAction('view')}
              className="flex items-center gap-1 rounded bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>返回详情</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {action === 'view' && type !== 'root' && onOpenComments && (
            <button
              onClick={() => {
                const title = type === 'task' 
                  ? `任务证据链: ${data.name}` 
                  : `节点进展与证据链: ${data.name}`;
                const subtitle = type === 'task'
                  ? `负责人: ${data.owner} | 截止日: ${data.due_date || '未定'}`
                  : `负责人: ${data.owner}`;
                onOpenComments({
                  nodeId: type === 'task' ? undefined : data.id,
                  taskId: type === 'task' ? data.id : undefined,
                  title,
                  subtitle,
                });
              }}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors flex items-center justify-center cursor-pointer select-none border border-zinc-150/60 bg-zinc-50/20"
              title="查看/追加证据链与进度备注"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 抽屉主体内容 */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1">
        {action === 'view' ? (
          <>
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
          </>
        ) : (
          <div className="space-y-3.5">
            {action === 'add_sub_node' && (
              <AddSubNodeForm
                defaultOwner={data.owner || ''}
                onClose={() => setAction('view')}
                onSubmit={async (name, owner, desc, dur, dueDate) => {
                  const res = await safeFetchJson('/api/nodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      parentId: data.id,
                      name,
                      owner,
                      description: desc,
                      estimatedDuration: dur,
                      dueDate,
                    }),
                  });
                  if (res.ok && res.data?.ok) {
                    onRefreshData?.();
                    setAction('view');
                  }
                }}
              />
            )}
            {action === 'add_task' && (
              <AddTaskForm
                nodeName={data.name}
                defaultOwner={data.owner || ''}
                isSubtask={type === 'task'}
                onClose={() => setAction('view')}
                onSubmit={async (name, owner, dueDate, hasDeliverable, deliverableRequirement, estimatedDuration, deliverableItems) => {
                  const nodeId = type === 'task' ? data.node_id : data.id;
                  const parentId = type === 'task' ? data.id : null;
                  const res = await safeFetchJson('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nodeId,
                      name,
                      owner,
                      dueDate,
                      hasDeliverable,
                      deliverableRequirement,
                      estimatedDuration,
                      deliverableItems,
                      parentId,
                    }),
                  });
                  if (res.ok && res.data?.ok) {
                    onRefreshData?.();
                    setAction('view');
                  }
                }}
              />
            )}
            {action === 'edit' && type === 'module' && (
              <EditSubNodeForm
                initialName={data.name}
                initialOwner={data.owner}
                initialDesc={data.description}
                initialDuration={data.estimated_duration}
                initialDueDate={data.due_date}
                onClose={() => setAction('view')}
                onSubmit={async (name, owner, desc, dur, dueDate, changeReason) => {
                  const res = await safeFetchJson('/api/nodes', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: data.id,
                      name,
                      owner,
                      description: desc,
                      estimatedDuration: dur,
                      priority: data.priority,
                      dueDate,
                      changeReason,
                    }),
                  });
                  if (res.ok && res.data?.ok) {
                    onRefreshData?.();
                    setAction('view');
                  }
                }}
              />
            )}
            {action === 'edit' && type === 'task' && (
              <TaskEditForm
                task={data}
                onCancel={() => setAction('view')}
                onSave={async (updatedTask, changeReason) => {
                  const res = await safeFetchJson('/api/tasks', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: updatedTask.id,
                      name: updatedTask.name,
                      owner: updatedTask.owner,
                      dueDate: updatedTask.due_date,
                      estimatedDuration: updatedTask.estimated_duration !== undefined ? updatedTask.estimated_duration : '',
                      hasDeliverable: updatedTask.has_deliverable,
                      deliverableRequirement: updatedTask.deliverable_requirement,
                      deliverableItems: updatedTask.deliverable_items,
                      deliverableSubmission: updatedTask.deliverable_submission,
                      doneAt: updatedTask.done_at,
                      status: updatedTask.status,
                      changeReason,
                    }),
                  });
                  if (res.ok && res.data?.ok) {
                    onRefreshData?.();
                    setAction('view');
                  }
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* WBS 动作配置区 (固定于抽屉底部) */}
      {action === 'view' && type !== 'root' && (
        <div className="pt-3.5 border-t border-zinc-100 mt-1 flex-none bg-white">
          <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">WBS 节点操作</h4>
          <div className="flex items-stretch gap-1 w-full bg-zinc-50/50 p-1 rounded-xl border border-zinc-200/80">
            {type !== 'task' ? (
              <>
                <button
                  onClick={() => setAction('add_sub_node')}
                  className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-0.5 text-[10px] sm:text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 transition-all min-w-0 select-none cursor-pointer"
                  title="添加子分组"
                >
                  <Plus className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="truncate">加子分组</span>
                </button>
                <button
                  onClick={() => setAction('add_task')}
                  className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-0.5 text-[10px] sm:text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 transition-all min-w-0 select-none cursor-pointer"
                  title="添加任务"
                >
                  <Plus className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="truncate">加任务</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setAction('add_task')}
                className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-0.5 text-[10px] sm:text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 transition-all min-w-0 select-none cursor-pointer"
                title="添加子任务"
              >
                <Plus className="h-3.5 w-3.5 text-zinc-500" />
                <span className="truncate">加子任务</span>
              </button>
            )}

            <button
              onClick={() => setAction('edit')}
              className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-0.5 text-[10px] sm:text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 transition-all min-w-0 select-none cursor-pointer"
              title="编辑属性详情"
            >
              <Edit2 className="h-3.5 w-3.5 text-zinc-500" />
              <span className="truncate">编辑详情</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const pId = selectedNode.projectId || data.id;
                const customEvent = new CustomEvent('trigger-ai-parse', {
                  detail: {
                    projectId: pId,
                    type,
                    data,
                  }
                });
                window.dispatchEvent(customEvent);
              }}
              className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50/50 py-1.5 px-0.5 text-[10px] sm:text-[11px] font-bold text-violet-700 hover:bg-violet-100 hover:border-violet-300 active:bg-violet-200/50 transition-all min-w-0 select-none cursor-pointer"
              title="AI 语义提炼"
            >
              <Bot className="h-3.5 w-3.5 text-violet-600 animate-pulse" />
              <span className="truncate font-bold">AI语义提炼</span>
            </button>

            {type !== 'project' && (
              <button
                onClick={() => setAction('delete_confirm')}
                className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50/30 py-1.5 px-0.5 text-[10px] sm:text-[11px] font-bold text-rose-600 hover:bg-rose-100/80 hover:border-rose-300 active:bg-rose-200/50 transition-all min-w-0 select-none cursor-pointer"
                title="级联删除节点"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span className="truncate">删除</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Modals and Dialogs */}
      {action === 'edit' && type === 'project' && (
        <EditProjectModal
          isOpen={true}
          initialName={data.name}
          initialOwner={data.owner}
          initialPriority={data.priority}
          initialDescription={data.description}
          initialDuration={data.estimated_duration}
          initialDueDate={data.due_date}
          onClose={() => setAction('view')}
          onSave={async (name, owner, description, duration, priority, dueDate, changeReason) => {
            const res = await safeFetchJson('/api/nodes', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: data.id,
                name,
                owner,
                description,
                estimatedDuration: duration,
                priority,
                dueDate,
                changeReason,
              }),
            });
            if (res.ok && res.data?.ok) {
              onRefreshData?.();
              setAction('view');
            }
          }}
        />
      )}

      {action === 'delete_confirm' && (
        <ConfirmDialog
          isOpen={true}
          title={type === 'task' ? '确认删除任务' : '确认删除分组节点'}
          message={
            type === 'task'
              ? `确定要删除任务「${data.name}」吗？此操作将同时清理该任务关联的交付物与证据链记录，且不可撤销。`
              : `确定删除分组「${data.name}」及其下全部子节点和任务吗？该操作将级联清理所有数据，无法恢复。`
          }
          confirmText="确定删除"
          cancelText="取消"
          isDestructive={true}
          onConfirm={async () => {
            const endpoint = type === 'task' ? `/api/tasks?id=${encodeURIComponent(data.id)}` : `/api/nodes?id=${encodeURIComponent(data.id)}`;
            const res = await safeFetchJson(endpoint, { method: 'DELETE' });
            if (res.ok && res.data?.ok) {
              onRefreshData?.();
              onClose();
            }
          }}
          onCancel={() => setAction('view')}
        />
      )}
    </aside>
  );
}

