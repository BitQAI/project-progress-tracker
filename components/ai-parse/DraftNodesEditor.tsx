'use client';

import React, { useState } from 'react';
import { ParsedDraftNode, ParsedDraftTask, createEmptyDraftNode, createEmptyDraftTask } from '@/lib/ai-wbs-types';
import {
  FolderPlus,
  Trash2,
  Calendar,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  FileCheck,
  Layers,
} from 'lucide-react';

interface DraftNodesEditorProps {
  nodes: ParsedDraftNode[];
  defaultOwner: string;
  onChange: (updatedNodes: ParsedDraftNode[]) => void;
}

export function DraftNodesEditor({ nodes, defaultOwner, onChange }: DraftNodesEditorProps) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    nodes.forEach((n) => {
      initial[n.id] = true;
    });
    return initial;
  });

  const toggleExpand = (nodeId: string) => {
    setExpandedNodeIds((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleNodeChange = (nIdx: number, field: keyof ParsedDraftNode, value: any) => {
    const next = [...nodes];
    next[nIdx] = { ...next[nIdx], [field]: value };
    onChange(next);
  };

  const handleAddNode = () => {
    const newNode = createEmptyDraftNode(defaultOwner);
    onChange([...nodes, newNode]);
    setExpandedNodeIds((prev) => ({ ...prev, [newNode.id]: true }));
  };

  const handleDeleteNode = (nIdx: number) => {
    onChange(nodes.filter((_, i) => i !== nIdx));
  };

  const handleAddTaskToNode = (nIdx: number) => {
    const next = [...nodes];
    const targetNode = next[nIdx];
    const currentTasks = targetNode.tasks || [];
    targetNode.tasks = [...currentTasks, createEmptyDraftTask(targetNode.owner || defaultOwner)];
    onChange(next);
  };

  const handleTaskChangeInNode = (nIdx: number, tIdx: number, field: keyof ParsedDraftTask, value: any) => {
    const next = [...nodes];
    const targetNode = next[nIdx];
    if (!targetNode.tasks) return;
    const nextTasks = [...targetNode.tasks];
    nextTasks[tIdx] = { ...nextTasks[tIdx], [field]: value };
    targetNode.tasks = nextTasks;
    onChange(next);
  };

  const handleDeleteTaskFromNode = (nIdx: number, tIdx: number) => {
    const next = [...nodes];
    const targetNode = next[nIdx];
    if (!targetNode.tasks) return;
    targetNode.tasks = targetNode.tasks.filter((_, i) => i !== tIdx);
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
          <Layers className="h-3.5 w-3.5 text-emerald-600" />
          <span>待导入分组 / 模块草稿</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-semibold text-emerald-800">
            {nodes.length} 个模块 · 共 {nodes.reduce((acc, n) => acc + (n.tasks?.length || 0), 0)} 项任务
          </span>
          {nodes.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 ml-2 border-l border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  const allSelected = nodes.every((n) => n.selected !== false);
                  const updated = nodes.map((n) => ({
                    ...n,
                    selected: !allSelected,
                    tasks: (n.tasks || []).map((t) => ({ ...t, selected: !allSelected })),
                  }));
                  onChange(updated);
                }}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold transition-colors hover:underline"
              >
                {nodes.every((n) => n.selected !== false) ? '取消全选' : '一键全选'}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddNode}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors shadow-3xs"
        >
          <FolderPlus className="h-3 w-3 text-emerald-600" />
          <span>添加模块分组</span>
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-6 text-center text-xs text-zinc-400">
          暂无分组节点，点击右上角「添加模块分组」进行手动新增
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {nodes.map((node, nIdx) => {
            const isExpanded = expandedNodeIds[node.id] ?? true;
            return (
              <div
                key={node.id || nIdx}
                className={`rounded-xl border p-3 text-xs shadow-3xs transition-all space-y-2.5 ${
                  node.selected !== false
                    ? 'border-zinc-200 bg-white hover:border-emerald-300'
                    : 'border-zinc-200/60 bg-zinc-50/40 opacity-60'
                }`}
              >
                {/* 模块头部 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={node.selected !== false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      const updatedNodes = [...nodes];
                      updatedNodes[nIdx] = {
                        ...updatedNodes[nIdx],
                        selected: isChecked,
                        tasks: (updatedNodes[nIdx].tasks || []).map((t) => ({ ...t, selected: isChecked })),
                      };
                      onChange(updatedNodes);
                    }}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer shrink-0"
                    title={node.selected !== false ? '取消导入整个模块及任务' : '勾选以导入整个模块'}
                  />
                  <button
                    type="button"
                    onClick={() => toggleExpand(node.id)}
                    className="p-0.5 text-zinc-400 hover:text-zinc-700 rounded shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-[10px] font-bold text-emerald-800 shrink-0">
                    M{nIdx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="模块/分组名称..."
                    value={node.name}
                    onChange={(e) => handleNodeChange(nIdx, 'name', e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteNode(nIdx)}
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                    title="删除整个模块草稿"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 模块元数据 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pl-6">
                  <div className="flex items-center gap-1 bg-zinc-50/80 rounded-md px-2 py-0.8 border border-zinc-200/60">
                    <User className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span className="text-zinc-500 shrink-0">负责人:</span>
                    <input
                      type="text"
                      value={node.owner}
                      onChange={(e) => handleNodeChange(nIdx, 'owner', e.target.value)}
                      className="w-full bg-transparent text-zinc-800 font-medium focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-50/80 rounded-md px-2 py-0.8 border border-zinc-200/60">
                    <Calendar className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span className="text-zinc-500 shrink-0">截止:</span>
                    <input
                      type="date"
                      value={node.dueDate || ''}
                      onChange={(e) => handleNodeChange(nIdx, 'dueDate', e.target.value || null)}
                      className="w-full bg-transparent text-zinc-800 text-[11px] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-50/80 rounded-md px-2 py-0.8 border border-zinc-200/60">
                    <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span className="text-zinc-500 shrink-0">工期:</span>
                    <input
                      type="text"
                      value={node.estimatedDuration || ''}
                      onChange={(e) => handleNodeChange(nIdx, 'estimatedDuration', e.target.value)}
                      placeholder="如: 2周"
                      className="w-full bg-transparent text-zinc-800 font-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* 模块描述 */}
                <div className="pl-6">
                  <input
                    type="text"
                    value={node.description || ''}
                    onChange={(e) => handleNodeChange(nIdx, 'description', e.target.value)}
                    placeholder="模块说明/交付范围备忘..."
                    className="w-full rounded border border-zinc-200 bg-zinc-50/40 px-2 py-0.8 text-[11px] text-zinc-600 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* 模块下属初始任务列表 */}
                {isExpanded && (
                  <div className="pl-6 pt-1 space-y-2 border-l-2 border-emerald-200/60 ml-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-600">
                        模块任务清单 ({(node.tasks || []).length} 项)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddTaskToNode(nIdx)}
                        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        <span>加任务</span>
                      </button>
                    </div>

                    {(node.tasks || []).map((task, tIdx) => {
                      const isTaskSelected = node.selected !== false && task.selected !== false;
                      return (
                        <div
                          key={task.id || tIdx}
                          className={`rounded-lg border p-2 space-y-1.5 transition-all ${
                            isTaskSelected
                              ? 'border-zinc-200 bg-zinc-50/50'
                              : 'border-zinc-150 bg-zinc-100/40 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              disabled={node.selected === false}
                              checked={task.selected !== false}
                              onChange={(e) => {
                                handleTaskChangeInNode(nIdx, tIdx, 'selected', e.target.checked);
                              }}
                              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer disabled:opacity-50 shrink-0"
                              title={node.selected === false ? '必须先勾选该模块分组才能配置此任务' : '勾选或取消该特定任务'}
                            />
                            <input
                              type="text"
                              placeholder="任务名称..."
                              value={task.name}
                              onChange={(e) => handleTaskChangeInNode(nIdx, tIdx, 'name', e.target.value)}
                              className="flex-1 rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              placeholder="负责人"
                              value={task.owner}
                              onChange={(e) => handleTaskChangeInNode(nIdx, tIdx, 'owner', e.target.value)}
                              className="w-20 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] text-zinc-700 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteTaskFromNode(nIdx, tIdx)}
                              className="p-1 text-zinc-400 hover:text-red-600 rounded shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] pl-5">
                            <label className="inline-flex items-center gap-1 cursor-pointer text-zinc-600">
                              <input
                                type="checkbox"
                                disabled={node.selected === false}
                                checked={!!task.hasDeliverable}
                                onChange={(e) => handleTaskChangeInNode(nIdx, tIdx, 'hasDeliverable', e.target.checked)}
                                className="rounded border-zinc-300 text-emerald-600 h-3.5 w-3.5 disabled:opacity-50"
                              />
                              <span className="flex items-center gap-0.5">
                                <FileCheck className="h-2.5 w-2.5 text-amber-600" />
                                需交付件
                              </span>
                            </label>
                            {task.hasDeliverable && (
                              <input
                                type="text"
                                disabled={node.selected === false}
                                placeholder="交付件验收要求..."
                                value={task.deliverableRequirement || ''}
                                onChange={(e) =>
                                  handleTaskChangeInNode(nIdx, tIdx, 'deliverableRequirement', e.target.value)
                                }
                                className="flex-1 rounded border border-amber-200 bg-white px-1.5 py-0.2 text-[10px] text-zinc-700 disabled:opacity-50"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
