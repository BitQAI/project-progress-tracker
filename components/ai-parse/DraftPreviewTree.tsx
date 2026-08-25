'use client';

import React from 'react';
import { ParsedDraftNode, ParsedDraftTask, WbsParseTargetLevel } from '@/lib/ai-wbs-types';
import { FolderTree, Layers, CheckSquare, Calendar, User, FileCheck, ArrowRight } from 'lucide-react';

interface DraftPreviewTreeProps {
  targetLevel: WbsParseTargetLevel;
  contextName: string;
  nodes?: ParsedDraftNode[];
  tasks?: ParsedDraftTask[];
}

export function DraftPreviewTree({ targetLevel, contextName, nodes = [], tasks = [] }: DraftPreviewTreeProps) {
  const totalNodesCount = targetLevel === 'project_subnodes' ? nodes.length : 0;
  const totalTasksCount =
    targetLevel === 'project_subnodes'
      ? nodes.reduce((acc, n) => acc + (n.tasks?.length || 0), 0)
      : tasks.length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-xs space-y-3">
      {/* 导入影响摘要条 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-zinc-800">
          <FolderTree className="h-4 w-4 text-blue-600" />
          <span>导入结构拓扑预览</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-500">目标挂载:</span>
          <span className="font-semibold text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
            {contextName}
          </span>
          <ArrowRight className="h-3 w-3 text-zinc-400" />
          <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 font-bold">
            +{totalNodesCount > 0 ? `${totalNodesCount} 模块 ` : ''}
            +{totalTasksCount} 任务
          </span>
        </div>
      </div>

      {/* 结构树呈现 */}
      <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
        {/* 根/当前节点 */}
        <div className="flex items-center gap-2 rounded-lg bg-zinc-200/60 px-2.5 py-1.5 text-zinc-900 font-bold">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span>{contextName}</span>
          <span className="ml-auto text-[10px] text-zinc-500 font-sans font-normal">
            {targetLevel === 'project_subnodes'
              ? '（项目根节点）'
              : targetLevel === 'node_tasks'
              ? '（所属模块）'
              : '（父任务）'}
          </span>
        </div>

        {/* 项目层拆解渲染 */}
        {targetLevel === 'project_subnodes' && (
          <div className="space-y-2 pl-4 border-l-2 border-dashed border-zinc-300 ml-3">
            {nodes.map((node, nIdx) => (
              <div key={node.id || nIdx} className="space-y-1">
                <div className="flex items-center gap-2 rounded-md bg-white border border-zinc-200 px-2 py-1 shadow-3xs text-zinc-800">
                  <Layers className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-zinc-900 font-sans">{node.name || '未命名模块'}</span>
                  <div className="ml-auto flex items-center gap-2 text-[10px] text-zinc-500 font-sans">
                    <span className="flex items-center gap-0.5">
                      <User className="h-2.5 w-2.5 text-zinc-400" />
                      {node.owner}
                    </span>
                    {node.estimatedDuration && <span>⏱ {node.estimatedDuration}</span>}
                    {node.dueDate && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5 text-zinc-400" />
                        {node.dueDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* 模块内任务 */}
                {node.tasks && node.tasks.length > 0 && (
                  <div className="space-y-1 pl-4 border-l border-zinc-200 ml-3">
                    {node.tasks.map((task, tIdx) => (
                      <div
                        key={task.id || tIdx}
                        className="flex items-center gap-1.5 rounded bg-zinc-50 border border-zinc-150 px-2 py-0.8 text-zinc-700 font-sans"
                      >
                        <CheckSquare className="h-3 w-3 text-blue-600 shrink-0" />
                        <span className="font-medium">{task.name || '未命名任务'}</span>
                        <div className="ml-auto flex items-center gap-2 text-[10px] text-zinc-400">
                          <span>{task.owner}</span>
                          {task.hasDeliverable && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                              <FileCheck className="h-2.5 w-2.5" />
                              交付件
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 模块任务或子任务拆解渲染 */}
        {targetLevel !== 'project_subnodes' && (
          <div className="space-y-1 pl-4 border-l-2 border-dashed border-zinc-300 ml-3">
            {tasks.map((task, idx) => (
              <div
                key={task.id || idx}
                className="flex items-center gap-2 rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-zinc-800 font-sans shadow-3xs"
              >
                <CheckSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-medium text-zinc-900">{task.name || '未命名任务'}</span>
                <div className="ml-auto flex items-center gap-2 text-[10px] text-zinc-500 font-sans">
                  <span className="flex items-center gap-0.5">
                    <User className="h-2.5 w-2.5 text-zinc-400" />
                    {task.owner}
                  </span>
                  {task.estimatedDuration && <span>⏱ {task.estimatedDuration}</span>}
                  {task.dueDate && (
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5 text-zinc-400" />
                      {task.dueDate}
                    </span>
                  )}
                  {task.hasDeliverable && (
                    <span className="flex items-center gap-0.5 text-amber-600 font-medium bg-amber-50 px-1 py-0.2 rounded border border-amber-200/60">
                      <FileCheck className="h-2.5 w-2.5" />
                      需交付
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
