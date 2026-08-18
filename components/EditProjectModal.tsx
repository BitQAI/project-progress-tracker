'use client';

import React, { useState } from 'react';
import { ProjectPriority } from '@/lib/types';

interface EditProjectModalProps {
  isOpen: boolean;
  initialName: string;
  initialOwner: string;
  initialPriority?: ProjectPriority;
  initialDescription?: string;
  initialDuration?: string;
  initialDueDate?: string | null;
  onClose: () => void;
  onSave: (
    name: string,
    owner: string,
    description: string,
    duration: string,
    priority: ProjectPriority,
    dueDate: string | null
  ) => Promise<void>;
}

export function EditProjectModal({
  isOpen,
  initialName,
  initialOwner,
  initialPriority = 'P1',
  initialDescription = '',
  initialDuration = '',
  initialDueDate = '',
  onClose,
  onSave,
}: EditProjectModalProps) {
  const [name, setName] = useState(initialName);
  const [owner, setOwner] = useState(initialOwner);
  const [priority, setPriority] = useState<ProjectPriority>(initialPriority);
  const [description, setDescription] = useState(initialDescription);
  const [duration, setDuration] = useState(initialDuration);
  const [dueDate, setDueDate] = useState(initialDueDate || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim(), owner.trim(), description.trim(), duration.trim(), priority, dueDate || null);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-2xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 text-xs"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-zinc-900">编辑项目基本信息与周期</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">项目名称 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 p-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">项目负责人 *</label>
              <input
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 p-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">项目优先级 *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="w-full rounded-lg border border-zinc-300 p-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
              >
                <option value="P0">P0 - 紧急且核心</option>
                <option value="P1">P1 - 高优先级</option>
                <option value="P2">P2 - 中优先级</option>
                <option value="P3">P3 - 低优先级</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">预估交付周期</label>
              <input
                type="text"
                placeholder="如: 8周 / 2026Q4"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 p-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">计划截止日</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 p-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">项目描述与背景前情</label>
            <textarea
              rows={3}
              placeholder="说明项目的业务目标、关键产出物与范围..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 p-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-zinc-600 hover:bg-zinc-100"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-white font-semibold hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </form>
    </div>
  );
}
