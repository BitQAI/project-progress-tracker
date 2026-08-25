'use client';

import React from 'react';
import { ParsedDraftTask, createEmptyDraftTask } from '@/lib/ai-wbs-types';
import { Plus, Trash2, Calendar, User, Clock, FileCheck, CheckSquare } from 'lucide-react';

interface DraftTasksEditorProps {
  tasks: ParsedDraftTask[];
  defaultOwner: string;
  onChange: (updatedTasks: ParsedDraftTask[]) => void;
  title?: string;
  isSubtask?: boolean;
}

export function DraftTasksEditor({
  tasks,
  defaultOwner,
  onChange,
  title = '待导入任务清单',
  isSubtask = false,
}: DraftTasksEditorProps) {
  const handleTaskChange = (index: number, field: keyof ParsedDraftTask, value: any) => {
    const next = [...tasks];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const handleAddTask = () => {
    onChange([...tasks, createEmptyDraftTask(defaultOwner)]);
  };

  const handleDeleteTask = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
          <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
          <span>{title}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-semibold text-blue-700">
            {tasks.length} 项
          </span>
          {tasks.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 ml-2 border-l border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  const allSelected = tasks.every((t) => t.selected !== false);
                  onChange(tasks.map((t) => ({ ...t, selected: !allSelected })));
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition-colors hover:underline"
              >
                {tasks.every((t) => t.selected !== false) ? '取消全选' : '一键全选'}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddTask}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors shadow-3xs"
        >
          <Plus className="h-3 w-3 text-blue-600" />
          <span>添加{isSubtask ? '子任务' : '任务'}</span>
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-6 text-center text-xs text-zinc-400">
          暂无任务草稿，点击右上角「添加{isSubtask ? '子任务' : '任务'}」进行补充
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {tasks.map((task, idx) => (
            <div
              key={task.id || idx}
              className={`group rounded-xl border p-2.5 text-xs shadow-3xs transition-all space-y-2 ${
                task.selected !== false
                  ? 'border-zinc-200 bg-white hover:border-blue-300'
                  : 'border-zinc-200/60 bg-zinc-50/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.selected !== false}
                  onChange={(e) => handleTaskChange(idx, 'selected', e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer shrink-0"
                  title={task.selected !== false ? '取消导入此项' : '勾选以导入此项'}
                />
                <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-100 text-[10px] font-bold text-zinc-500 shrink-0 select-none">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  required
                  placeholder={isSubtask ? '子任务名称...' : '任务名称...'}
                  value={task.name}
                  onChange={(e) => handleTaskChange(idx, 'name', e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteTask(idx)}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="删除此项草稿"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="flex items-center gap-1 bg-zinc-50/80 rounded-md px-2 py-0.8 border border-zinc-200/60">
                  <User className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 shrink-0">负责人:</span>
                  <input
                    type="text"
                    value={task.owner}
                    onChange={(e) => handleTaskChange(idx, 'owner', e.target.value)}
                    className="w-full bg-transparent text-zinc-800 font-medium focus:outline-none"
                    placeholder="姓名"
                  />
                </div>

                <div className="flex items-center gap-1 bg-zinc-50/80 rounded-md px-2 py-0.8 border border-zinc-200/60">
                  <Calendar className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 shrink-0">截止日:</span>
                  <input
                    type="date"
                    value={task.dueDate || ''}
                    onChange={(e) => handleTaskChange(idx, 'dueDate', e.target.value || null)}
                    className="w-full bg-transparent text-zinc-800 text-[11px] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 bg-zinc-50/80 rounded-md px-2 py-0.8 border border-zinc-200/60">
                  <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 shrink-0">工期:</span>
                  <input
                    type="text"
                    value={task.estimatedDuration || ''}
                    onChange={(e) => handleTaskChange(idx, 'estimatedDuration', e.target.value)}
                    placeholder="如: 3天 / 1周"
                    className="w-full bg-transparent text-zinc-800 font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* 交付件规范配置 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-zinc-100 text-[11px]">
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-zinc-700 shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={!!task.hasDeliverable}
                    onChange={(e) => handleTaskChange(idx, 'hasDeliverable', e.target.checked)}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span className="flex items-center gap-1">
                    <FileCheck className="h-3 w-3 text-amber-600" />
                    需交付成果
                  </span>
                </label>

                {task.hasDeliverable && (
                  <input
                    type="text"
                    placeholder="交付件验收要求（如：提交接口Swagger文档 / PRD签字件）"
                    value={task.deliverableRequirement || ''}
                    onChange={(e) => handleTaskChange(idx, 'deliverableRequirement', e.target.value)}
                    className="flex-1 rounded border border-amber-200 bg-amber-50/50 px-2 py-0.5 text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
