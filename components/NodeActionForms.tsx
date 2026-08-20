'use client';

import React, { useState } from 'react';
import { DeliverableItem } from '@/lib/types';
import { DeliverableTableEditor, formatDeliverablesToText } from './DeliverableTableEditor';

interface AddTaskFormProps {
  nodeName: string;
  defaultOwner: string;
  onClose: () => void;
  onSubmit: (
    name: string,
    owner: string,
    dueDate: string | undefined,
    hasDeliverable: boolean,
    deliverableRequirement?: string,
    estimatedDuration?: string,
    deliverableItems?: DeliverableItem[]
  ) => void;
}

export function AddTaskForm({
  nodeName,
  defaultOwner,
  onClose,
  onSubmit,
}: AddTaskFormProps) {
  const [taskName, setTaskName] = useState('');
  const [taskOwner, setTaskOwner] = useState(defaultOwner);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstimatedDuration, setTaskEstimatedDuration] = useState('');
  const [taskHasDeliverable, setTaskHasDeliverable] = useState(false);
  const [taskDeliverableItems, setTaskDeliverableItems] = useState<DeliverableItem[]>([
    { id: 'deliv_init_1', name: '', requirement: '' },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !taskOwner.trim()) return;
    const formattedReq = taskHasDeliverable ? formatDeliverablesToText(taskDeliverableItems) : undefined;
    const validItems = taskHasDeliverable ? taskDeliverableItems.filter((i) => i.name.trim()) : undefined;

    onSubmit(
      taskName.trim(),
      taskOwner.trim(),
      taskDueDate ? taskDueDate : undefined,
      taskHasDeliverable,
      formattedReq,
      taskEstimatedDuration.trim() || undefined,
      validItems
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs space-y-3"
    >
      <div className="flex items-center justify-between font-semibold text-blue-900 border-b border-blue-200/60 pb-1.5">
        <span>在此分组节点下新增任务</span>
        <span className="text-[11px] text-blue-700 font-normal">所属模块: {nodeName}</span>
      </div>
      <input
        type="text"
        required
        placeholder="输入任务名称，如：编写接口联调文档 / 原型方案评审"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 shrink-0">负责人:</span>
          <input
            type="text"
            required
            value={taskOwner}
            onChange={(e) => setTaskOwner(e.target.value)}
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 shrink-0">截止日期:</span>
          <input
            type="date"
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 shrink-0">预估周期:</span>
          <input
            type="text"
            value={taskEstimatedDuration}
            onChange={(e) => setTaskEstimatedDuration(e.target.value)}
            placeholder="如: 3天 / 1周 / 4h"
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900 focus:outline-none"
          />
        </div>
      </div>

      {/* 交付件选项与有序表格编辑器 */}
      <div className="pt-2 border-t border-blue-200/60 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-800 select-none">
          <input
            type="checkbox"
            checked={taskHasDeliverable}
            onChange={(e) => setTaskHasDeliverable(e.target.checked)}
            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span>设置交付件要求（勾选后支持在有序表格中配置多个交付件及验收标准）</span>
        </label>

        {taskHasDeliverable && (
          <DeliverableTableEditor
            items={taskDeliverableItems}
            onChange={setTaskDeliverableItems}
          />
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2.5 py-1 text-zinc-600 hover:bg-zinc-200"
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-3 py-1 text-white font-medium hover:bg-blue-700 shadow-xs"
        >
          添加任务
        </button>
      </div>
    </form>
  );
}

interface AddSubNodeFormProps {
  defaultOwner: string;
  onClose: () => void;
  onSubmit: (name: string, owner: string, desc?: string, estimatedDuration?: string, dueDate?: string) => void;
}

export function AddSubNodeForm({
  defaultOwner,
  onClose,
  onSubmit,
}: AddSubNodeFormProps) {
  const [subNodeName, setSubNodeName] = useState('');
  const [subNodeOwner, setSubNodeOwner] = useState(defaultOwner);
  const [subNodeDesc, setSubNodeDesc] = useState('');
  const [subNodeDuration, setSubNodeDuration] = useState('');
  const [subNodeDueDate, setSubNodeDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subNodeName.trim() || !subNodeOwner.trim()) return;
    onSubmit(
      subNodeName.trim(),
      subNodeOwner.trim(),
      subNodeDesc.trim() || undefined,
      subNodeDuration.trim() || undefined,
      subNodeDueDate ? subNodeDueDate : undefined
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs space-y-3"
    >
      <div className="font-semibold text-emerald-900 border-b border-emerald-200/60 pb-1.5 flex items-center justify-between">
        <span>创建下级子分组 / 模块节点</span>
        <span className="text-[11px] text-emerald-700 font-normal">多字段清晰平铺展开</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">分组/模块名称 <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            placeholder="如：智能 RAG 向量知识库 / 核心业务 API"
            value={subNodeName}
            onChange={(e) => setSubNodeName(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">负责人 <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            placeholder="负责人姓名"
            value={subNodeOwner}
            onChange={(e) => setSubNodeOwner(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">预估周期</label>
          <input
            type="text"
            placeholder="如: 2周 / 10个工作日 / 3天"
            value={subNodeDuration}
            onChange={(e) => setSubNodeDuration(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">预估完成时间 (计划截止日)</label>
          <input
            type="date"
            value={subNodeDueDate}
            onChange={(e) => setSubNodeDueDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-600 mb-1">分组描述 / 模块说明</label>
        <textarea
          rows={2}
          placeholder="补充该分组的建设目标、交付范围或关键技术要点..."
          value={subNodeDesc}
          onChange={(e) => setSubNodeDesc(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2.5 py-1 text-zinc-600 hover:bg-zinc-200"
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-3 py-1 text-white font-medium hover:bg-emerald-700 shadow-xs"
        >
          创建分组
        </button>
      </div>
    </form>
  );
}

interface EditSubNodeFormProps {
  initialName: string;
  initialOwner: string;
  initialDesc?: string;
  initialDuration?: string;
  initialDueDate?: string | null;
  onClose: () => void;
  onSubmit: (name: string, owner: string, desc?: string, estimatedDuration?: string, dueDate?: string, changeReason?: string) => void;
}

export function EditSubNodeForm({
  initialName,
  initialOwner,
  initialDesc = '',
  initialDuration = '',
  initialDueDate = '',
  onClose,
  onSubmit,
}: EditSubNodeFormProps) {
  const [subNodeName, setSubNodeName] = useState(initialName);
  const [subNodeOwner, setSubNodeOwner] = useState(initialOwner);
  const [subNodeDesc, setSubNodeDesc] = useState(initialDesc);
  const [subNodeDuration, setSubNodeDuration] = useState(initialDuration);
  const [subNodeDueDate, setSubNodeDueDate] = useState(initialDueDate || '');
  const [changeReason, setChangeReason] = useState('');

  const isScheduleChanged =
    subNodeDuration.trim() !== (initialDuration || '').trim() ||
    (subNodeDueDate || null) !== (initialDueDate || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subNodeName.trim() || !subNodeOwner.trim()) return;
    if (isScheduleChanged && !changeReason.trim()) return;
    onSubmit(
      subNodeName.trim(),
      subNodeOwner.trim(),
      subNodeDesc.trim() || undefined,
      subNodeDuration.trim() || undefined,
      subNodeDueDate ? subNodeDueDate : undefined,
      isScheduleChanged ? changeReason.trim() : undefined
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs space-y-3"
    >
      <div className="font-semibold text-blue-900 border-b border-blue-200/60 pb-1.5 flex items-center justify-between">
        <span>编辑分组 / 模块信息</span>
        <span className="text-[11px] text-blue-700 font-normal">多字段清晰平铺展开</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">分组/模块名称 <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            placeholder="分组/模块名称"
            value={subNodeName}
            onChange={(e) => setSubNodeName(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">负责人 <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            placeholder="负责人姓名"
            value={subNodeOwner}
            onChange={(e) => setSubNodeOwner(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">预估周期</label>
          <input
            type="text"
            placeholder="如: 2周 / 10个工作日 / 3天"
            value={subNodeDuration}
            onChange={(e) => setSubNodeDuration(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1">预估完成时间 (计划截止日)</label>
          <input
            type="date"
            value={subNodeDueDate}
            onChange={(e) => setSubNodeDueDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-600 mb-1">分组描述 / 模块说明</label>
        <textarea
          rows={2}
          placeholder="补充该分组的建设目标、交付范围或关键技术要点..."
          value={subNodeDesc}
          onChange={(e) => setSubNodeDesc(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isScheduleChanged && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5 animate-in fade-in duration-200 text-xs">
          <label className="block text-[11px] font-semibold text-amber-950">
            排期调整理由 * <span className="text-[10px] font-normal text-amber-600">(检测到计划截止日或预估交付周期发生变更，请填写理由)</span>
          </label>
          <textarea
            required
            rows={2}
            placeholder="请填写详细变更理由（如：需求变更、核心骨干请假、关键依赖延期、工期重估等）..."
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            className="w-full rounded-lg border border-amber-300 p-2 text-zinc-900 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2.5 py-1 text-zinc-600 hover:bg-zinc-200"
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
