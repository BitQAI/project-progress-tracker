'use client';

import React, { useState, useMemo } from 'react';
import { DbTask, FileAttachment, DeliverableItem } from '@/lib/types';
import { getTodayBeijingString } from '@/lib/date-utils';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { TaskEditForm } from './TaskEditForm';
import { AddTaskForm } from './NodeActionForms';
import { TaskDeliverablePreview, getAttachmentFormatIcon } from './TaskDeliverablePreview';
import {
  CheckSquare,
  Square,
  Calendar,
  User,
  AlertCircle,
  MessageSquare,
  MoreHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
  FileCheck,
  Clock,
  Paperclip,
  Plus,
  CornerDownRight,
  Bot,
} from 'lucide-react';

interface TaskItemProps {
  task: DbTask;
  subtasks?: DbTask[];
  onToggleStatus: (task: DbTask, newStatus: 'pending' | 'done', customDoneAt?: string) => void;
  onRequestSubmitDeliverable: (task: DbTask) => void;
  onUpdateTask: (task: DbTask, changeReason?: string) => void;
  onDeleteTask: (taskId: string, taskName?: string) => void;
  onOpenComments: (task: DbTask) => void;
  onAddTask: (
    nodeId: string,
    name: string,
    owner: string,
    dueDate: string | undefined,
    hasDeliverable?: boolean,
    deliverableRequirement?: string,
    estimatedDuration?: string,
    deliverableItems?: DeliverableItem[],
    parentId?: string | null
  ) => void;
  onOpenAiParse?: (params: {
    targetLevel: 'task_subtasks';
    targetNodeId: string;
    targetTaskId: string;
    contextName: string;
    defaultOwner: string;
  }) => void;
  hideCompleted?: boolean;
}

export function TaskItem({
  task,
  subtasks = [],
  onToggleStatus,
  onRequestSubmitDeliverable,
  onUpdateTask,
  onDeleteTask,
  onOpenComments,
  onAddTask,
  onOpenAiParse,
  hideCompleted = false,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const todayStr = useMemo(() => getTodayBeijingString(), []);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeliverableDetail, setShowDeliverableDetail] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [previewAttachmentList, setPreviewAttachmentList] = useState<FileAttachment[]>([]);

  const isOverdue = task.status === 'pending' && task.due_date && task.due_date < todayStr;
  const overdueDays = useMemo(() => {
    if (!isOverdue || !task.due_date) return 0;
    const dDue = new Date(task.due_date.slice(0, 10) + 'T00:00:00').getTime();
    const dToday = new Date(todayStr + 'T00:00:00').getTime();
    return Math.max(1, Math.floor((dToday - dDue) / (1000 * 60 * 60 * 24)));
  }, [isOverdue, task.due_date, todayStr]);
  const isDone = task.status === 'done';

  // 计算已完成状态下的完工偏差展示徽章
  const getCompletionDiffBadge = () => {
    if (!isDone || !task.done_at || !task.due_date) return null;
    const doneDateStr = task.done_at.split('T')[0];
    const dueDateStr = task.due_date;

    const dDone = new Date(doneDateStr + 'T00:00:00');
    const dDue = new Date(dueDateStr + 'T00:00:00');
    const diffMs = dDone.getTime() - dDue.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const days = Math.abs(diffDays);
      return {
        text: `提前 ${days} 天完工`,
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        doneDate: doneDateStr,
      };
    } else if (diffDays === 0) {
      return {
        text: '按期完工',
        className: 'bg-teal-100 text-teal-800 border-teal-200',
        doneDate: doneDateStr,
      };
    } else {
      return {
        text: `延期 ${diffDays} 天完工`,
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        doneDate: doneDateStr,
      };
    }
  };

  const completionInfo = getCompletionDiffBadge();

  const handleCheckboxClick = () => {
    if (isDone) {
      onToggleStatus(task, 'pending');
    } else {
      onRequestSubmitDeliverable(task);
    }
  };

  if (isEditing) {
    return (
      <TaskEditForm
        task={task}
        onSave={(updatedTask, changeReason) => {
          onUpdateTask(updatedTask, changeReason);
          setIsEditing(false);
          setShowMenu(false);
        }}
        onCancel={() => {
          setIsEditing(false);
          setShowMenu(false);
        }}
      />
    );
  }

  return (
    <div
      id={`task-row-${task.id}`}
      className={`group flex flex-col rounded-xl border p-2 sm:p-2.5 text-xs transition-all ${
        isDone
          ? 'border-emerald-150 bg-emerald-50/35 text-zinc-600'
          : isOverdue
          ? 'border-red-200 bg-red-50/50 text-zinc-800'
          : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:shadow-2xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
          {/* 勾选框 */}
          <button
            type="button"
            id={`checkbox-task-${task.id}`}
            onClick={handleCheckboxClick}
            className={`shrink-0 transition-transform active:scale-90 p-1 rounded-md ${
              isDone ? 'text-emerald-600' : 'text-zinc-400 hover:text-zinc-800'
            }`}
            title={
              isDone
                ? '已完成 (点击重置为未完成)'
                : task.has_deliverable
                ? '点击提交交付件并完成任务'
                : '点击勾选完成'
            }
          >
            {isDone ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>

          {/* 任务名称 */}
          <span
            className={`font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs ${
              isDone ? 'line-through text-zinc-400' : 'text-zinc-800'
            }`}
          >
            {task.name}
          </span>

          {/* 预估周期 */}
          {task.estimated_duration && (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 shrink-0 border border-zinc-200">
              <Clock className="h-2.5 w-2.5 text-zinc-400" />
              {task.estimated_duration}
            </span>
          )}

          {/* 交付件徽章 */}
          {task.has_deliverable && (
            <button
              type="button"
              onClick={() => setShowDeliverableDetail(!showDeliverableDetail)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold shrink-0 transition-colors ${
                task.deliverable_submission
                  ? 'bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-amber-100/80 text-amber-800 hover:bg-amber-200'
              }`}
              title={task.deliverable_submission ? '已归档交付件，点击查看' : '需交付件成果'}
            >
              <FileCheck className="h-3 w-3" />
              <span className="hidden xs:inline">{task.deliverable_submission ? '交付件已归档' : '需交付件'}</span>
              <span className="inline xs:hidden">{task.deliverable_submission ? '已归档' : '需交付'}</span>
            </button>
          )}

          {/* 附件速查徽章 */}
          {task.deliverable_attachments && task.deliverable_attachments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeliverableDetail(!showDeliverableDetail)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors"
              title={`点击展开附件清单 (共 ${task.deliverable_attachments.length} 个附件)`}
            >
              <Paperclip className="h-2.5 w-2.5" />
              <span>{task.deliverable_attachments.length}个附件</span>
            </button>
          )}

          {/* 超期/延期提示 */}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded bg-red-100 border border-red-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 shrink-0">
              <AlertCircle className="h-3 w-3 text-red-600" />
              延期 {overdueDays} 天
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 shrink-0 pt-1 sm:pt-0 border-t border-zinc-100/60 sm:border-t-0">
          {/* 负责人 */}
          <span className="flex items-center gap-1 text-zinc-500">
            <User className="h-3 w-3 text-zinc-400" />
            <span>{task.owner}</span>
          </span>

          {/* 截止日或完成时间 */}
          <div className="flex items-center gap-1.5">
            {isDone ? (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {completionInfo && (
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${completionInfo.className}`}
                  >
                    {completionInfo.text}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-zinc-500" title={`原计划截止日: ${task.due_date}，实际完工: ${task.done_at ? task.done_at.split('T')[0] : ''}`}>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>完工 {completionInfo ? completionInfo.doneDate : (task.done_at ? task.done_at.split('T')[0] : '')}</span>
                </span>
              </div>
            ) : (
              <span
                className={`flex items-center gap-1 ${
                  isOverdue ? 'font-semibold text-red-600' : 'text-zinc-500'
                }`}
              >
                <Calendar className="h-3 w-3 text-zinc-400" />
                <span>{task.due_date ? `截止: ${task.due_date}` : '无截止日'}</span>
              </span>
            )}
          </div>

          {/* 证据链/评论 */}
          <button
            onClick={() => onOpenComments(task)}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            title="查看/追加证据链与进度备注"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>

          {/* AI 拆解子任务快捷入口 */}
          {onOpenAiParse && (
            <button
              type="button"
              onClick={() =>
                onOpenAiParse({
                  targetLevel: 'task_subtasks',
                  targetNodeId: task.node_id,
                  targetTaskId: task.id,
                  contextName: task.name,
                  defaultOwner: task.owner || '',
                })
              }
              className="rounded p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="使用 AI 智能解析并拆解此任务的下级子任务"
            >
              <Bot className="h-3.5 w-3.5" />
            </button>
          )}

          {/* 新增子任务按钮 */}
          <button
            type="button"
            onClick={() => setIsAddingSubtask(!isAddingSubtask)}
            className={`rounded p-1 transition-colors ${
              isAddingSubtask ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
            title="新增下级子任务"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {/* 操作菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 opacity-80 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 z-20 w-32 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                {onOpenAiParse && (
                  <button
                    onClick={() => {
                      onOpenAiParse({
                        targetLevel: 'task_subtasks',
                        targetNodeId: task.node_id,
                        targetTaskId: task.id,
                        contextName: task.name,
                        defaultOwner: task.owner || '',
                      });
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-xs text-blue-700 hover:bg-blue-50 font-medium"
                  >
                    <Bot className="h-3.5 w-3.5 text-blue-600" />
                    AI 拆解子任务
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsAddingSubtask(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  <Plus className="h-3 w-3 text-blue-600" />
                  新增子任务
                </button>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  <Edit2 className="h-3 w-3" />
                  编辑
                </button>
                <button
                  onClick={() => {
                    onDeleteTask(task.id, task.name);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 交付件展开详情 */}
      {showDeliverableDetail && task.has_deliverable && (
        <TaskDeliverablePreview
          task={task}
          completionInfo={completionInfo}
          onRequestSubmitDeliverable={onRequestSubmitDeliverable}
          onPreviewAttachment={(att) => {
            setPreviewAttachment(att);
            setPreviewAttachmentList(task.deliverable_attachments || [att]);
          }}
        />
      )}

      {/* 附件在线预览模态框 */}
      {previewAttachment && (
        <AttachmentPreviewModal
          isOpen={!!previewAttachment}
          attachment={previewAttachment}
          attachmentList={previewAttachmentList}
          onSelectAttachment={(att) => setPreviewAttachment(att)}
          onClose={() => {
            setPreviewAttachment(null);
            setPreviewAttachmentList([]);
          }}
        />
      )}

      {/* 新增子任务表单区域 */}
      {isAddingSubtask && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-zinc-200">
          <AddTaskForm
            nodeName={task.name}
            defaultOwner={task.owner || ''}
            isSubtask={true}
            onClose={() => setIsAddingSubtask(false)}
            onSubmit={(name, owner, dueDate, hasDeliverable, deliverableRequirement, estimatedDuration, deliverableItems) => {
              onAddTask(
                task.node_id,
                name,
                owner,
                dueDate,
                hasDeliverable,
                deliverableRequirement,
                estimatedDuration,
                deliverableItems,
                task.id
              );
              setIsAddingSubtask(false);
            }}
          />
        </div>
      )}

      {/* 子任务递归渲染列表 */}
      {subtasks && subtasks.length > 0 && (
        <div className="mt-2.5 pl-3 sm:pl-4 border-l-2 border-dashed border-zinc-200/80 space-y-2">
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold select-none pt-0.5">
            <CornerDownRight className="h-3 w-3 text-zinc-300" />
            <span>子任务 ({subtasks.length} 项)</span>
          </div>
          <div className="space-y-2">
            {subtasks
              .filter((sub) => !hideCompleted || sub.status !== 'done')
              .map((sub) => (
                <TaskItem
                  key={sub.id}
                  task={sub}
                  subtasks={[]}
                  onToggleStatus={onToggleStatus}
                  onRequestSubmitDeliverable={onRequestSubmitDeliverable}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onOpenComments={onOpenComments}
                  onAddTask={onAddTask}
                  onOpenAiParse={onOpenAiParse}
                  hideCompleted={hideCompleted}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
