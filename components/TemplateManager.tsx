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
} from 'lucide-react';

export function TemplateManager() {
  const [templates, setTemplates] = useState<TemplateWithStages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // 模板删除确认状态
  const [tplToDelete, setTplToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [stages, setStages] = useState<any[]>([
    {
      name: '阶段一：战略诊断与市场竞争对标',
      tasks: [
        {
          name: '宏观 PEST 与行业竞争态势分析',
          has_deliverable: true,
          deliverable_requirement: '交付《外部 PEST 宏观及标杆多维对标报告》',
          subtasks: [
            { name: 'PEST 宏观政策分析与准入壁垒审计', has_deliverable: false, deliverable_requirement: '' },
            { name: '行业前五标杆企业核心财务及竞争战略对标', has_deliverable: true, deliverable_requirement: '交付《标杆企业商业模式与多维对标报告》' }
          ]
        }
      ]
    }
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

  // 阶段管理
  const handleAddStage = () => {
    setStages([
      ...stages,
      {
        name: `阶段 ${stages.length + 1}：新设立交付阶段`,
        tasks: [
          {
            name: '新增交付任务',
            has_deliverable: false,
            deliverable_requirement: '',
            subtasks: []
          }
        ]
      }
    ]);
  };

  const handleRemoveStage = (sIdx: number) => {
    if (stages.length <= 1) return;
    setStages(stages.filter((_: any, i: number) => i !== sIdx));
  };

  const handleStageNameChange = (sIdx: number, value: string) => {
    const next = [...stages];
    next[sIdx].name = value;
    setStages(next);
  };

  // 任务管理
  const handleAddTask = (sIdx: number) => {
    const next = [...stages];
    next[sIdx].tasks.push({
      name: '新交付任务',
      has_deliverable: false,
      deliverable_requirement: '',
      subtasks: []
    });
    setStages(next);
  };

  const handleRemoveTask = (sIdx: number, tIdx: number) => {
    const next = [...stages];
    next[sIdx].tasks = next[sIdx].tasks.filter((_: any, i: number) => i !== tIdx);
    setStages(next);
  };

  const handleTaskChange = (sIdx: number, tIdx: number, key: string, value: any) => {
    const next = [...stages];
    next[sIdx].tasks[tIdx][key] = value;
    setStages(next);
  };

  // 子任务管理
  const handleAddSubtask = (sIdx: number, tIdx: number) => {
    const next = [...stages];
    if (!next[sIdx].tasks[tIdx].subtasks) {
      next[sIdx].tasks[tIdx].subtasks = [];
    }
    next[sIdx].tasks[tIdx].subtasks.push({
      name: '新二级子任务',
      has_deliverable: false,
      deliverable_requirement: ''
    });
    setStages(next);
  };

  const handleRemoveSubtask = (sIdx: number, tIdx: number, subIdx: number) => {
    const next = [...stages];
    next[sIdx].tasks[tIdx].subtasks = next[sIdx].tasks[tIdx].subtasks.filter((_: any, i: number) => i !== subIdx);
    setStages(next);
  };

  const handleSubtaskChange = (sIdx: number, tIdx: number, subIdx: number, key: string, value: any) => {
    const next = [...stages];
    next[sIdx].tasks[tIdx].subtasks[subIdx][key] = value;
    setStages(next);
  };

  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) return;

    try {
      const res = await safeFetchJson('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tplName.trim(), description: tplDescription.trim(), stages }),
      });
      if (res.ok && res.data?.ok) {
        setShowCreateModal(false);
        setTplName('');
        setTplDescription('');
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
            同类型项目一键复制流程（深拷贝阶段生成节点链、多层级交付件转为任务与子任务树），确保大型高层咨询与组织诊断方案完美上轨落地。
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
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between border-b border-zinc-150 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-900 text-sm">{tpl.name}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 shrink-0">
                          {tpl.stages.length} 个阶段
                        </span>
                      </div>
                      {tpl.description && (
                        <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setTplToDelete({ id: tpl.id, name: tpl.name })}
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                      title="删除模板"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* 阶段及多层级交付件 */}
                  <div className="mt-4 space-y-3">
                    {tpl.stages.map((stg, sIdx) => {
                      const parents = stg.deliverables.filter((d) => !d.parent_id);
                      // 如果由于某些原因没有 parent_id，平铺渲染作为 fallback
                      const actualParents = parents.length > 0 ? parents : stg.deliverables;

                      return (
                        <div key={stg.id} className="rounded-xl border border-zinc-150 bg-zinc-50/70 p-3 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-800 mb-2 border-b border-zinc-200/60 pb-1">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-700">
                              {sIdx + 1}
                            </span>
                            <span>{stg.name}</span>
                          </div>

                          <div className="space-y-2 mt-1.5 pl-1">
                            {actualParents.map((p) => {
                              const children = stg.deliverables.filter((d) => d.parent_id === p.id);
                              return (
                                <div key={p.id} className="space-y-1">
                                  <div className="flex items-start gap-1 text-zinc-800 font-bold text-[11px]">
                                    <span className="text-zinc-400 mt-0.5">•</span>
                                    <div className="flex-1 flex items-center gap-1 flex-wrap">
                                      <span>{p.name}</span>
                                      {p.has_deliverable && (
                                        <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1 rounded shrink-0">
                                          需交付
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {children.length > 0 && (
                                    <div className="pl-3.5 space-y-1 border-l border-zinc-200/80 ml-1">
                                      {children.map((c) => (
                                        <div key={c.id} className="flex items-start gap-1 text-zinc-600 font-medium text-[11px]">
                                          <span className="text-zinc-400 text-[10px] mt-0.5">▪</span>
                                          <div className="flex-1 flex items-center gap-1 flex-wrap">
                                            <span title={c.deliverable_requirement || undefined}>{c.name}</span>
                                            {c.has_deliverable && (
                                              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded shrink-0">
                                                需交付
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-150 flex items-center justify-between text-xs text-zinc-400">
                  <span>录入于 {tpl.created_at.split('T')[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建模板弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              创建标准项目流程模板 (多层级支持)
            </h2>

            <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-700">模板名称</label>
                  <input
                    type="text"
                    required
                    placeholder="如：企业中长期战略规划与组织变革一体化咨询标准方案"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-700">模板描述</label>
                  <input
                    type="text"
                    placeholder="如：适用于大型集团或高成长企业战略定位与管控重构项目"
                    value={tplDescription}
                    onChange={(e) => setTplDescription(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* 阶段及多层级任务 */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-zinc-700">配置交付阶段与任务树</label>
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
                  <div key={sIdx} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500">阶段 {sIdx + 1}</span>
                      <input
                        type="text"
                        required
                        value={stg.name}
                        onChange={(e) => handleStageNameChange(sIdx, e.target.value)}
                        placeholder="阶段名称"
                        className="flex-1 rounded border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-900 focus:outline-none"
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

                    {/* 任务列表 */}
                    <div className="space-y-3 pl-4 border-l-2 border-zinc-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-500">一级任务 (Tasks)</span>
                        <button
                          type="button"
                          onClick={() => handleAddTask(sIdx)}
                          className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          添加任务
                        </button>
                      </div>

                      {stg.tasks.map((task: any, tIdx: number) => (
                        <div key={tIdx} className="rounded-lg border border-zinc-150 bg-white p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-zinc-400 mt-1">{tIdx + 1}.</span>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                value={task.name}
                                onChange={(e) => handleTaskChange(sIdx, tIdx, 'name', e.target.value)}
                                placeholder="任务名称"
                                className="rounded border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-800 focus:outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <label className="inline-flex items-center gap-1 text-[11px] text-zinc-500 select-none shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={task.has_deliverable}
                                    onChange={(e) => handleTaskChange(sIdx, tIdx, 'has_deliverable', e.target.checked)}
                                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                  />
                                  <span>硬性交付件</span>
                                </label>
                                {task.has_deliverable && (
                                  <input
                                    type="text"
                                    required={task.has_deliverable}
                                    value={task.deliverable_requirement}
                                    onChange={(e) => handleTaskChange(sIdx, tIdx, 'deliverable_requirement', e.target.value)}
                                    placeholder="交付验收要求"
                                    className="flex-1 rounded border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700 focus:outline-none"
                                  />
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTask(sIdx, tIdx)}
                              className="text-zinc-400 hover:text-red-500 text-xs mt-1 shrink-0"
                            >
                              删除
                            </button>
                          </div>

                          {/* 子任务列表 */}
                          <div className="pl-6 pt-1 border-t border-zinc-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-zinc-400">二级子任务 (Subtasks)</span>
                              <button
                                type="button"
                                onClick={() => handleAddSubtask(sIdx, tIdx)}
                                className="text-[9px] text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                添加子任务
                              </button>
                            </div>

                            {task.subtasks && task.subtasks.map((sub: any, subIdx: number) => (
                              <div key={subIdx} className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded border border-zinc-150">
                                <span className="text-[10px] font-bold text-zinc-400">└</span>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    required
                                    value={sub.name}
                                    onChange={(e) => handleSubtaskChange(sIdx, tIdx, subIdx, 'name', e.target.value)}
                                    placeholder="子任务名称"
                                    className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700 focus:outline-none bg-white"
                                  />
                                  <div className="flex items-center gap-2">
                                    <label className="inline-flex items-center gap-1 text-[10px] text-zinc-500 select-none shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={sub.has_deliverable}
                                        onChange={(e) => handleSubtaskChange(sIdx, tIdx, subIdx, 'has_deliverable', e.target.checked)}
                                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                      />
                                      <span>需提交交付物</span>
                                    </label>
                                    {sub.has_deliverable && (
                                      <input
                                        type="text"
                                        required={sub.has_deliverable}
                                        value={sub.deliverable_requirement}
                                        onChange={(e) => handleSubtaskChange(sIdx, tIdx, subIdx, 'deliverable_requirement', e.target.value)}
                                        placeholder="交付验收要求"
                                        className="flex-1 rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 focus:outline-none bg-white"
                                      />
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubtask(sIdx, tIdx, subIdx)}
                                  className="text-zinc-400 hover:text-red-500 text-[11px] shrink-0"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150">
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
