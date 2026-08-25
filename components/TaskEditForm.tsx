'use client';

import React, { useState, useMemo } from 'react';
import { DbTask, DeliverableItem } from '@/lib/types';
import { DeliverableTableEditor, parseDeliverablesFromInput, formatDeliverablesToText } from './DeliverableTableEditor';
import { getTodayBeijingString } from '@/lib/date-utils';
import { Clock } from 'lucide-react';

interface TaskEditFormProps {
  task: DbTask;
  onSave: (updatedTask: DbTask, changeReason?: string) => void;
  onCancel: () => void;
}

export function TaskEditForm({ task, onSave, onCancel }: TaskEditFormProps) {
  const todayStr = useMemo(() => getTodayBeijingString(), []);
  const [name, setName] = useState(task.name);
  const [owner, setOwner] = useState(task.owner);
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [estimatedDuration, setEstimatedDuration] = useState(task.estimated_duration || '');
  const [hasDeliverable, setHasDeliverable] = useState(!!task.has_deliverable);
  const [deliverableItems, setDeliverableItems] = useState<DeliverableItem[]>(() =>
    parseDeliverablesFromInput(task.deliverable_requirement, task.deliverable_items)
  );
  const [isDoneState, setIsDoneState] = useState(task.status === 'done');
  const [editDoneDate, setEditDoneDate] = useState(() => {
    return task.done_at ? task.done_at.split('T')[0] : todayStr;
  });
  const [changeReason, setChangeReason] = useState('');

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

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) return;
    const formattedReq = hasDeliverable ? formatDeliverablesToText(deliverableItems) : undefined;
    const validItems = hasDeliverable ? deliverableItems.filter((i) => i.name.trim()) : undefined;

    const isScheduleChanged =
      estimatedDuration.trim() !== (task.estimated_duration || '').trim() ||
      (dueDate || null) !== (task.due_date || null);

    if (isScheduleChanged && !changeReason.trim()) return;

    onSave(
      {
        ...task,
        name: name.trim(),
        owner: owner.trim(),
        due_date: dueDate ? dueDate : null,
        estimated_duration: estimatedDuration.trim(),
        status: isDoneState ? 'done' : 'pending',
        done_at: isDoneState ? editDoneDate : null,
        has_deliverable: hasDeliverable,
        deliverable_requirement: formattedReq,
        deliverable_items: validItems,
      },
      isScheduleChanged ? changeReason.trim() : undefined
    );
  };

  const isScheduleChanged =
    estimatedDuration.trim() !== (task.estimated_duration || '').trim() ||
    (dueDate || null) !== (task.due_date || null);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
            负责人 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
            计划截止日
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
            预估周期
          </label>
          <input
            type="text"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value)}
            placeholder="如: 3天 / 1周"
            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {isScheduleChanged && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5 animate-in fade-in duration-200">
          <label className="block text-[11px] font-semibold text-amber-950">
            排期调整理由 * <span className="text-[10px] font-normal text-amber-600">(检测到计划截止日或预估交付周期发生变更，请填写理由)</span>
          </label>
          <textarea
            required
            rows={2}
            placeholder="请填写详细变更理由（如：需求变更、核心骨干请假、计划延后、工期重估等）..."
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            className="w-full rounded-lg border border-amber-300 p-2 text-zinc-900 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-200/50">
        <button
          type="button"
          onClick={onCancel}
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
