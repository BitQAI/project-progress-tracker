'use client';

import React, { useState, useEffect } from 'react';
import { TemplateWithStages } from '@/lib/types';
import { safeFetchJson } from '@/lib/fetch-utils';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Layers,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export function TemplateManager() {
  const [templates, setTemplates] = useState<TemplateWithStages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // 模板删除确认状态
  const [tplToDelete, setTplToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [tplName, setTplName] = useState('');
  const [stages, setStages] = useState<{ name: string; deliverables: string[] }[]>([
    { name: '阶段一：方案与规划', deliverables: ['需求说明书', '方案架构文档'] },
    { name: '阶段二：执行与落地', deliverables: ['核心功能开发与联调', '业务初验报告'] },
  ]);

  useEffect(() => {
    let ignore = false;
    async function loadTemplates() {
      try {
        const res = await safeFetchJson('/api/templates');
        if (!ignore && res.ok && res.data?.ok && res.data?.data) {
          setTemplates(res.data.data);
        }
      } catch (err) {
        console.error('Fetch templates error:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadTemplates();
    return () => {
      ignore = true;
    };
  }, [refreshCount]);

  const handleConfirmDeleteTemplate = async () => {
    if (!tplToDelete) return;
    setIsDeleting(true);
    try {
      await safeFetchJson(`/api/templates?id=${encodeURIComponent(tplToDelete.id)}`, { method: 'DELETE' });
      setTplToDelete(null);
      setRefreshCount((c) => c + 1);
    } catch (err) {
      console.error('Delete template error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddStage = () => {
    setStages([...stages, { name: `阶段 ${stages.length + 1}`, deliverables: ['核心交付物说明'] }]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) return;
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleAddDeliverable = (stageIndex: number) => {
    const next = [...stages];
    next[stageIndex].deliverables.push('新交付件');
    setStages(next);
  };

  const handleRemoveDeliverable = (stageIndex: number, delIndex: number) => {
    const next = [...stages];
    next[stageIndex].deliverables = next[stageIndex].deliverables.filter((_, i) => i !== delIndex);
    setStages(next);
  };

  const handleDeliverableChange = (stageIndex: number, delIndex: number, value: string) => {
    const next = [...stages];
    next[stageIndex].deliverables[delIndex] = value;
    setStages(next);
  };

  const handleStageNameChange = (stageIndex: number, value: string) => {
    const next = [...stages];
    next[stageIndex].name = value;
    setStages(next);
  };

  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) return;

    try {
      const res = await safeFetchJson('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tplName.trim(), stages }),
      });
      if (res.ok && res.data?.ok) {
        setShowCreateModal(false);
        setTplName('');
        setRefreshCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Create template error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部介绍 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">标准流程与交付件模板库</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-500 max-w-2xl">
            同类型项目一键复制流程（深拷贝阶段生成节点链、交付件转为可勾选任务），避免同类项目反复手工搭流程。模板变更不会影响已创建的历史项目。
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          id="btn-open-create-template"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>新建标准流程模板</span>
        </button>
      </div>

      {/* 模板列表 */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-xs text-zinc-400">
          加载模板库数据...
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-zinc-400">
          <Layers className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm">暂无流程模板，点击上方按钮创建第一个模板</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              id={`template-card-${tpl.id}`}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:border-zinc-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 text-sm">{tpl.name}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      {tpl.stages.length} 个阶段
                    </span>
                  </div>
                  <button
                    onClick={() => setTplToDelete({ id: tpl.id, name: tpl.name })}
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="删除模板"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* 阶段及交付件 */}
                <div className="mt-4 space-y-3">
                  {tpl.stages.map((stg, sIdx) => (
                    <div key={stg.id} className="rounded-xl border border-zinc-150 bg-zinc-50/70 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-800 mb-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-700">
                          {sIdx + 1}
                        </span>
                        <span>{stg.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {stg.deliverables.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] text-zinc-700 shadow-2xs"
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-150 flex items-center justify-between text-xs text-zinc-400">
                <span>录入于 {tpl.created_at.split('T')[0]}</span>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  <span>新建项目时选用</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建模板弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              创建标准项目流程模板
            </h2>

            <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-700">模板名称</label>
                <input
                  type="text"
                  required
                  placeholder="如：敏捷迭代研发流程 / 市场品宣全案落地"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-zinc-700">阶段 (Stages) 与 交付件 (Deliverables)</label>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加新阶段
                  </button>
                </div>

                {stages.map((stg, sIdx) => (
                  <div key={sIdx} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500">{sIdx + 1}.</span>
                      <input
                        type="text"
                        required
                        value={stg.name}
                        onChange={(e) => handleStageNameChange(sIdx, e.target.value)}
                        placeholder="阶段名称"
                        className="flex-1 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 focus:outline-none"
                      />
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(sIdx)}
                          className="rounded p-1 text-zinc-400 hover:text-red-600"
                          title="删除阶段"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 交付件 */}
                    <div className="space-y-1.5 pl-4">
                      {stg.deliverables.map((del, dIdx) => (
                        <div key={dIdx} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          <input
                            type="text"
                            required
                            value={del}
                            onChange={(e) => handleDeliverableChange(sIdx, dIdx, e.target.value)}
                            placeholder="交付件名称"
                            className="flex-1 rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-800 focus:outline-none"
                          />
                          {stg.deliverables.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDeliverable(sIdx, dIdx)}
                              className="text-zinc-400 hover:text-red-500 text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddDeliverable(sIdx)}
                        className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <Plus className="h-3 w-3" />
                        添加交付件
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 shadow-xs"
                >
                  保存模板
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除模板确认对话框 */}
      <ConfirmDialog
        isOpen={!!tplToDelete}
        title="确认删除流程模板"
        message={`确定删除模板「${tplToDelete?.name}」吗？已基于该模板创建的历史项目不受影响。`}
        confirmText="确认删除"
        cancelText="取消"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteTemplate}
        onCancel={() => setTplToDelete(null)}
      />
    </div>
  );
}
