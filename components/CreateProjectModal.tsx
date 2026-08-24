'use client';

import React, { useState, useEffect } from 'react';
import { TemplateWithStages, ProjectPriority } from '@/lib/types';
import { safeFetchJson } from '@/lib/fetch-utils';
import { X, Sparkles, FolderPlus, Layers, Check } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [priority, setPriority] = useState<ProjectPriority>('P1');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [mode, setMode] = useState<'scratch' | 'template'>('template');
  const [templates, setTemplates] = useState<TemplateWithStages[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!isOpen) return;

    async function loadTemplates() {
      try {
        const res = await safeFetchJson<any>('/api/templates');
        if (!ignore && res.ok && res.data?.ok && res.data?.data) {
          setTemplates(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedTemplateId((prev) => prev || res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Fetch templates error:', err);
      }
    }

    loadTemplates();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCloseModal = () => {
    setName('');
    setOwner('');
    setPriority('P1');
    setDescription('');
    setEstimatedDuration('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入项目名称');
      return;
    }
    if (!owner.trim()) {
      setError('请输入项目负责人');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        owner: owner.trim(),
        priority,
        description: description.trim() || undefined,
        estimatedDuration: estimatedDuration.trim() || undefined,
      };
      if (mode === 'template' && selectedTemplateId) {
        payload.templateId = selectedTemplateId;
      }

      const res = await safeFetchJson<any>('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.data?.ok) {
        throw new Error(res.error || res.data?.error || '创建项目失败');
      }

      onSuccess(res.data.data.id);
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || '网络异常，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
      <div
        id="create-project-modal"
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-zinc-150 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <FolderPlus className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">新建项目</h2>
          </div>
          <button
            onClick={handleCloseModal}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="new-project-name"
              type="text"
              required
              placeholder="例如：新一代智能客户服务系统"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700">
                项目负责人 <span className="text-red-500">*</span>
              </label>
              <input
                id="new-project-owner"
                type="text"
                required
                placeholder="例如：张工 / 项目经理"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700">
                项目优先级 <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none bg-white"
              >
                <option value="P0">P0 - 紧急且核心</option>
                <option value="P1">P1 - 高优先级</option>
                <option value="P2">P2 - 中优先级</option>
                <option value="P3">P3 - 低优先级</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700">
                预估周期 (非强约束)
              </label>
              <input
                id="new-project-duration"
                type="text"
                placeholder="例如：6周 / 2026Q3"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700">
              项目描述 / 背景前情
            </label>
            <textarea
              rows={2}
              id="new-project-description"
              placeholder="简述项目目标、核心交付范围与关键业务价值..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          {/* 创建方式切换 */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
              初始化方式
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-mode-template"
                onClick={() => setMode('template')}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                  mode === 'template'
                    ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-zinc-900">从模板一键生成</div>
                  <div className="text-[11px] text-zinc-500">深拷贝阶段与交付件</div>
                </div>
              </button>

              <button
                type="button"
                id="btn-mode-scratch"
                onClick={() => setMode('scratch')}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                  mode === 'scratch'
                    ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <FolderPlus className="h-4 w-4 text-zinc-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-zinc-900">空白项目</div>
                  <div className="text-[11px] text-zinc-500">自定义层级与任务</div>
                </div>
              </button>
            </div>
          </div>

          {/* 模板选择与预览 */}
          {mode === 'template' && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-3">
              <label className="block text-xs font-medium text-zinc-700">
                选择流程模板
              </label>
              <select
                id="select-template-dropdown"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.stages.length} 个阶段)
                  </option>
                ))}
              </select>

              {currentTemplate && (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 text-xs">
                  <div className="font-semibold text-zinc-600 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-zinc-500" />
                    <span>预置阶段及交付任务预览:</span>
                  </div>
                  {currentTemplate.stages.map((stg) => (
                    <div key={stg.id} className="rounded-md border border-zinc-200/80 bg-white p-2 text-zinc-700">
                      <div className="font-medium text-zinc-900">{stg.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {stg.deliverables.map((d) => (
                          <span key={d.id} className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                            <Check className="h-2.5 w-2.5 text-emerald-600" />
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-150">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              id="submit-create-project-btn"
              disabled={isLoading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-all"
            >
              {isLoading ? '正在创建...' : '立即创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
