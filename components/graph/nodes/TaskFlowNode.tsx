'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TaskNodeData } from '../types';
import { Check, User, Paperclip, AlertCircle, Calendar } from 'lucide-react';
import { getTodayBeijingString } from '@/lib/date-utils';

export function TaskFlowNode({ data }: NodeProps & { data: TaskNodeData }) {
  const { task, onToggleTask, onSelectNode, direction = 'LR' } = data;
  const isTB = direction === 'TB';

  const isDone = task.status === 'done';
  const todayStr = getTodayBeijingString();
  const isOverdue = !isDone && task.due_date && task.due_date < todayStr;

  let overdueDays = 0;
  if (isOverdue && task.due_date) {
    const dDue = new Date(task.due_date.slice(0, 10) + 'T00:00:00').getTime();
    const dToday = new Date(todayStr + 'T00:00:00').getTime();
    overdueDays = Math.max(1, Math.floor((dToday - dDue) / (1000 * 60 * 60 * 24)));
  }

  const hasDeliverable = task.has_deliverable || (task.deliverable_items && task.deliverable_items.length > 0);
  const isDeliverableSubmitted = !!(task.deliverable_submission || (task.deliverable_attachments && task.deliverable_attachments.length > 0));

  return (
    <div
      onClick={() => onSelectNode(task.id, 'task', task)}
      className={`group relative w-[230px] cursor-pointer rounded-lg border bg-white p-2.5 shadow-2xs transition-all hover:shadow-sm ${
        isDone
          ? 'border-emerald-200 bg-emerald-50/30'
          : isOverdue
          ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <Handle
        type="target"
        position={isTB ? Position.Top : Position.Left}
        className="!h-2 !w-2 !bg-zinc-400 !border-2 !border-white"
      />

      <div className="flex items-start gap-2">
        {/* 极简勾选框 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTask(task.id, task.status);
          }}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
            isDone
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-zinc-300 bg-white hover:border-zinc-400'
          }`}
          title={isDone ? '标记为未完成' : '极简勾选完成任务'}
        >
          {isDone && <Check className="h-3 w-3 stroke-[3]" />}
        </button>

        {/* 任务主体信息 */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-medium leading-snug line-clamp-2 ${
              isDone ? 'text-zinc-400 line-through' : 'text-zinc-900'
            }`}
            title={task.name}
          >
            {task.name}
          </p>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
            <div className="flex items-center gap-1">
              <User className="h-2.5 w-2.5 text-zinc-400" />
              <span className="truncate max-w-[60px]">{task.owner}</span>
            </div>

            {hasDeliverable && (
              <span
                className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded ${
                  isDeliverableSubmitted
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
                title={isDeliverableSubmitted ? '交付件已提交' : '待提交交付件'}
              >
                <Paperclip className="h-2.5 w-2.5" />
                <span>{isDeliverableSubmitted ? '已交' : '交付'}</span>
              </span>
            )}
          </div>

          {/* 逾期或截止日期 */}
          {isOverdue ? (
            <div className="mt-1 flex items-center gap-0.5 text-[10px] text-rose-600 font-semibold">
              <AlertCircle className="h-2.5 w-2.5" />
              <span>超期 {overdueDays}天</span>
            </div>
          ) : task.due_date ? (
            <div className="mt-1 flex items-center gap-0.5 text-[10px] text-zinc-400">
              <Calendar className="h-2.5 w-2.5" />
              <span>{task.due_date.slice(5, 10)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
