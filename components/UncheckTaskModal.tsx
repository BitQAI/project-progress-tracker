'use client';

import React, { useState, useEffect } from 'react';
import { DbTask } from '@/lib/types';
import { AlertTriangle, X, CheckCircle2, User, Calendar, RotateCcw } from 'lucide-react';

interface UncheckTaskModalProps {
  task: DbTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (taskId: string, reason: string) => Promise<void> | void;
}

const PRESET_REASONS = [
  '验收未通过需返工',
  '需求与范围发生变更',
  '交付成果需补充完善',
  '误操作勾选',
  '阶段性联调发现缺陷',
];

export function UncheckTaskModal({
  task,
  isOpen,
  onClose,
  onSubmitSuccess,
}: UncheckTaskModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 每次打开弹窗时重置状态
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, task?.id]);

  if (!isOpen || !task) return null;

  const doneDateStr = task.done_at ? task.done_at.split('T')[0] : '已记录';

  const handleSelectPreset = (preset: string) => {
    setErrorMsg('');
    setReason((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return preset;
      if (trimmed.includes(preset)) return prev;
      return `${trimmed}；${preset}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 2) {
      setErrorMsg('请详细填写取消已完成的原因说明（至少 2 个字）');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSubmitSuccess(task.id, trimmedReason);
      onClose();
    } catch (err: any) {
      console.error('Submit uncheck reason error:', err);
      setErrorMsg(err?.message || '提交取消说明失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div
        id="uncheck-task-modal-dialog"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4"
      >
        {/* 弹窗头部 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">取消任务完成状态</h3>
              <p className="text-xs text-zinc-500">取消勾选已完成的任务必须提交原因说明并留档备查</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            title="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 目标任务信息卡片 */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 text-xs space-y-1.5">
          <div className="font-semibold text-zinc-900 line-clamp-2 text-sm">{task.name}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 text-[11px]">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 text-zinc-400" />
              <span>负责人: {task.owner || '未指定'}</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>实际完工日: {doneDateStr}</span>
            </span>
            {task.due_date && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Calendar className="h-3 w-3 text-zinc-400" />
                <span>计划截止: {task.due_date}</span>
              </span>
            )}
          </div>
        </div>

        {/* 操作警示提示框 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-900">
            <RotateCcw className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span>重要提示：</span>
          </div>
          <p className="leading-relaxed text-[11px] text-amber-800/90 pl-5">
            确认后，该任务将<strong>重置为待办（进行中）状态</strong>，原完工时间将被清除。您的取消说明将自动归档至项目动态与任务证据链中。
          </p>
        </div>

        {/* 表单区域 */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 快捷理由标签 */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1.5">
              常用原因快捷选择:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-700 hover:border-amber-400 hover:bg-amber-50/70 hover:text-amber-800 transition-colors shadow-3xs"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 原因说明输入框 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="uncheck-task-reason-textarea" className="text-xs font-semibold text-zinc-800">
                取消原因说明 <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-zinc-400">{reason.trim().length} 个字</span>
            </div>
            <textarea
              id="uncheck-task-reason-textarea"
              required
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="请详细说明取消已完成状态的原因（例如：验收发现交付物需补丁整改、设计需求变更等）..."
              className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-none"
            />
            {errorMsg && <p className="mt-1 text-[11px] text-red-600 font-medium">{errorMsg}</p>}
          </div>

          {/* 底部操作按钮 */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-150">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              id="btn-cancel-uncheck-task"
              className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              放弃，保持完成
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 2}
              id="btn-submit-uncheck-task"
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '正在提交...' : '确认取消并提交原因'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
