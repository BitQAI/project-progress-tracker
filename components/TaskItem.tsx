'use client';

import React, { useState, useMemo } from 'react';
import { DbTask, DeliverableItem } from '@/lib/types';
import { DeliverableTableEditor, parseDeliverablesFromInput, formatDeliverablesToText } from './DeliverableTableEditor';
import { getTodayBeijingString } from '@/lib/date-utils';
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
  Link2,
  Clock,
} from 'lucide-react';

interface TaskItemProps {
  task: DbTask;
  onToggleStatus: (task: DbTask, newStatus: 'pending' | 'done', customDoneAt?: string) => void;
  onRequestSubmitDeliverable: (task: DbTask) => void;
  onUpdateTask: (task: DbTask) => void;
  onDeleteTask: (taskId: string, taskName?: string) => void;
  onOpenComments: (task: DbTask) => void;
}

export function TaskItem({
  task,
  onToggleStatus,
  onRequestSubmitDeliverable,
  onUpdateTask,
  onDeleteTask,
  onOpenComments,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(task.name);
  const [owner, setOwner] = useState(task.owner);
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [estimatedDuration, setEstimatedDuration] = useState(task.estimated_duration || '');
  const [hasDeliverable, setHasDeliverable] = useState(!!task.has_deliverable);
  const [deliverableItems, setDeliverableItems] = useState<DeliverableItem[]>(() =>
    parseDeliverablesFromInput(task.deliverable_requirement, task.deliverable_items)
  );
  const [isDoneState, setIsDoneState] = useState(task.status === 'done');
  const todayStr = useMemo(() => getTodayBeijingString(), []);
  const [editDoneDate, setEditDoneDate] = useState(() => {
    return task.done_at ? task.done_at.split('T')[0] : todayStr;
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showDeliverableDetail, setShowDeliverableDetail] = useState(false);

  const isOverdue = task.status === 'pending' && task.due_date && task.due_date < todayStr;
  const overdueDays = useMemo(() => {
    if (!isOverdue || !task.due_date) return 0;
    const dDue = new Date(task.due_date.slice(0, 10) + 'T00:00:00').getTime();
    const dToday = new Date(todayStr + 'T00:00:00').getTime();
    return Math.max(1, Math.floor((dToday - dDue) / (1000 * 60 * 60 * 24)));
  }, [isOverdue, task.due_date, todayStr]);
  const isDone = task.status === 'done';

  // 计算编辑表单中完成时间与截止日的差异
  const editCompletionDiff = useMemo(() => {
    if (!isDoneState || !editDoneDate || !dueDate) return null;
    const dDone = new Date(editDoneDate + 'T00:00:00');
    const dDue = new Date(dueDate + 'T00:00:00');
    const diffMs = dDone.getTime() - dDue.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `提前 ${Math.abs(diffDays)} 天完工`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    } else if (diffDays === 0) {
      return {
        label: '按期完工',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      };
    } else {
      return {
        label: `延期 ${diffDays} 天完工`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    }
  }, [isDoneState, editDoneDate, dueDate]);

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

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) return;
    const formattedReq = hasDeliverable ? formatDeliverablesToText(deliverableItems) : undefined;
    const validItems = hasDeliverable ? deliverableItems.filter((i) => i.name.trim()) : undefined;

    onUpdateTask({
      ...task,
      name: name.trim(),
      owner: owner.trim(),
      due_date: dueDate ? dueDate : null,
      estimated_duration: estimatedDuration.trim() || undefined,
      status: isDoneState ? 'done' : 'pending',
      done_at: isDoneState ? editDoneDate : null,
      has_deliverable: hasDeliverable,
      deliverable_requirement: formattedReq,
      deliverable_items: validItems,
    });
    setIsEditing(false);
    setShowMenu(false);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleSaveEdit}
        className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-3 text-xs shadow-xs"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="任务名称"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 shrink-0">负责人:</span>
            <input
              type="text"
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 shrink-0">计划截止日:</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 shrink-0">预估周期:</span>
            <input
              type="text"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              placeholder="如: 3天 / 1周"
              className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        {/* 状态与实际完成时间设置 */}
        <div className="rounded-lg border border-blue-200/80 bg-white/70 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-zinc-800 select-none">
              <input
                type="checkbox"
                checked={isDoneState}
                onChange={(e) => {
                  setIsDoneState(e.target.checked);
                  if (e.target.checked && !editDoneDate) {
                    setEditDoneDate(todayStr);
                  }
                }}
                className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>标记为已完成任务</span>
            </label>
            {editCompletionDiff && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${editCompletionDiff.badgeClass}`}>
                {editCompletionDiff.label}
              </span>
            )}
          </div>

          {isDoneState && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-zinc-150">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-600 font-medium shrink-0">实际完成日:</span>
                <input
                  type="date"
                  required
                  value={editDoneDate}
                  onChange={(e) => setEditDoneDate(e.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditDoneDate(todayStr)}
                  className="rounded bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-700"
                >
                  今天
                </button>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setEditDoneDate(dueDate)}
                    className="rounded bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-700"
                  >
                    按计划日
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 交付件有序表格设置 */}
        <div className="pt-1 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-800 select-none">
            <input
              type="checkbox"
              checked={hasDeliverable}
              onChange={(e) => setHasDeliverable(e.target.checked)}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span>设置任务交付件要求（勾选后在有序表格中编辑交付项）</span>
          </label>

          {hasDeliverable && (
            <DeliverableTableEditor
              items={deliverableItems}
              onChange={setDeliverableItems}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-200/50">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-lg px-2.5 py-1 text-zinc-600 hover:bg-zinc-200"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-1 text-white font-medium hover:bg-blue-700 shadow-xs"
          >
            保存修改
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      id={`task-row-${task.id}`}
      className={`group flex flex-col rounded-xl border p-2.5 text-xs transition-all ${
        isDone
          ? 'border-emerald-150 bg-emerald-50/35 text-zinc-600'
          : isOverdue
          ? 'border-red-200 bg-red-50/50 text-zinc-800'
          : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:shadow-2xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
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
            className={`font-medium truncate max-w-[200px] sm:max-w-xs ${
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
              <span>{task.deliverable_submission ? '交付件已归档' : '需交付件'}</span>
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

        <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-1 sm:pt-0 border-t border-zinc-100/60 sm:border-t-0">
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

          {/* 操作菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 opacity-80 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 z-20 w-24 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
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

      {/* 交付件展开详情（紧凑单/双行精简视图） */}
      {showDeliverableDetail && task.has_deliverable && (
        <div className="mt-1.5 pt-1.5 border-t border-zinc-150 text-xs bg-zinc-50/70 p-2 rounded-md space-y-1">
          {task.deliverable_requirement && (
            <div className="text-zinc-600 flex items-start gap-1 text-[11px]">
              <span className="font-semibold text-zinc-700 shrink-0">交付规范:</span>
              <span className="text-zinc-600 leading-tight">{task.deliverable_requirement}</span>
            </div>
          )}
          {task.deliverable_submission ? (
            <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50/90 px-2 py-1 rounded border border-emerald-200/80">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold shrink-0">已归档成果:</span>
                <span className="truncate">{task.deliverable_submission}</span>
              </div>
              {completionInfo && (
                <span className="text-[10px] text-emerald-700 shrink-0 font-medium ml-2">
                  {completionInfo.text}
                </span>
              )}
            </div>
          ) : (
            <div className="text-amber-800 bg-amber-50/70 px-2 py-1 rounded border border-amber-200/60 flex items-center justify-between text-[11px]">
              <span>暂未提交成果，勾选完成时需录入交付件</span>
              <button
                type="button"
                onClick={() => onRequestSubmitDeliverable(task)}
                className="font-medium underline hover:text-amber-950 ml-2 shrink-0"
              >
                立即提交成果
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
