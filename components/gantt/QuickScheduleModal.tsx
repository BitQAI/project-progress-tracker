'use client';

import React, { useState } from 'react';
import { DbTask } from '@/lib/types';
import { Calendar, Clock, X, Check, Sparkles } from 'lucide-react';
import { getTodayBeijingString } from '@/lib/date-utils';
import { addDays } from './gantt-utils';

interface QuickScheduleModalProps {
  task: DbTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: DbTask, changeReason?: string) => Promise<void> | void;
}

interface ScheduleFormProps {
  task: DbTask;
  onClose: () => void;
  onSave: (task: DbTask, changeReason?: string) => Promise<void> | void;
}

function QuickScheduleForm({ task, onClose, onSave }: ScheduleFormProps) {
  const [dueDate, setDueDate] = useState<string>(
    task.due_date || addDays(getTodayBeijingString(), 3)
  );
  const [duration, setDuration] = useState<string>(task.estimated_duration || '3天');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickPreset = (daysCount: number) => {
    const today = getTodayBeijingString();
    setDueDate(addDays(today, daysCount));
    setDuration(`${daysCount}天`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) return;

    setIsSubmitting(true);
    try {
      await onSave(
        {
          ...task,
          due_date: dueDate,
          estimated_duration: duration || '3天',
        },
        '甘特图快速设定截止日与排期'
      );
      onClose();
    } catch (err) {
      console.error('Failed to update task schedule:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* 任务名称预览 */}
      <div className="rounded-xl border border-zinc-150 bg-zinc-50/80 p-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          目标任务
        </span>
        <div className="mt-0.5 text-xs font-bold text-zinc-900 line-clamp-2">
          {task.name}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
          <span>
            负责人: <strong className="text-zinc-700">{task.owner || '未指定'}</strong>
          </span>
          <span>•</span>
          <span className="text-amber-600 font-medium">当前状态: 待排期</span>
        </div>
      </div>

      {/* 快捷预设按钮 */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>常用排期预设:</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '明天 (1天)', days: 1 },
            { label: '3天后', days: 3 },
            { label: '下周五 (5天)', days: 5 },
            { label: '1周后 (7天)', days: 7 },
            { label: '2周后 (14天)', days: 14 },
          ].map((preset) => (
            <button
              key={preset.days}
              type="button"
              onClick={() => handleQuickPreset(preset.days)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 shadow-2xs hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义截止日期 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">
            计划截止日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-2xs focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">
            预估工期 (文本)
          </label>
          <div className="relative">
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="如: 3天 / 1周"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-2xs focus:border-blue-500 focus:outline-hidden"
            />
            <Clock className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-zinc-150 pt-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !dueDate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          <span>{isSubmitting ? '保存排期中...' : '定下排期并加入甘特轴'}</span>
        </button>
      </div>
    </form>
  );
}

export function QuickScheduleModal({
  task,
  isOpen,
  onClose,
  onSave,
}: QuickScheduleModalProps) {
  if (!isOpen || !task) return null;

  return (
    <div
      id="quick-schedule-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        id="quick-schedule-modal-card"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between border-b border-zinc-150 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">快速排期 / 设定截止日</h3>
              <p className="text-[11px] text-zinc-500">为已拟定的任务定下交付工期与时间节点</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <QuickScheduleForm
          key={task.id}
          task={task}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
