'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ModuleNodeData } from '../types';
import { Layers, User, Calendar, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

export function ModuleFlowNode({ data }: NodeProps & { data: ModuleNodeData }) {
  const { module, isExpanded, onToggleExpand, onSelectNode, direction = 'LR' } = data;
  const isTB = direction === 'TB';

  const hasChildren = (module.children && module.children.length > 0) || (module.tasks && module.tasks.length > 0);
  const totalSubCount = (module.children?.length || 0) + (module.tasks?.length || 0);

  return (
    <div
      onClick={() => onSelectNode(module.id, 'module', module)}
      className={`group relative w-[270px] cursor-pointer rounded-lg border bg-white p-3 shadow-2xs transition-all hover:shadow-sm ${
        module.hasOverdueTasks
          ? 'border-rose-300 ring-1 ring-rose-200 hover:border-rose-400'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <Handle
        type="target"
        position={isTB ? Position.Top : Position.Left}
        className="!h-2 !w-2 !bg-zinc-400 !border-2 !border-white"
      />

      {/* 头部 */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <h5 className="font-semibold text-zinc-900 text-xs truncate" title={module.name}>
            {module.name}
          </h5>
        </div>

        <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
          {module.progressPercent}%
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 mb-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            module.progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
          }`}
          style={{ width: `${module.progressPercent}%` }}
        />
      </div>

      {/* 信息行 */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-zinc-400" />
          <span className="truncate max-w-[80px]">{module.owner}</span>
        </div>

        {module.hasOverdueTasks ? (
          <div className="flex items-center gap-1 text-rose-600 font-medium bg-rose-50 px-1 py-0.2 rounded text-[10px]">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span>超期 {module.maxOverdueDays}天</span>
          </div>
        ) : module.latestDueDate ? (
          <div className="flex items-center gap-1 text-zinc-400 text-[10px]">
            <Calendar className="h-2.5 w-2.5" />
            <span>{module.latestDueDate.slice(5, 10)}</span>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-400">
            {module.completedTasksCount}/{module.totalTasksCount} 任务
          </span>
        )}
      </div>

      {/* 展开/折叠 */}
      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(module.id);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-zinc-200 bg-zinc-50/50 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
              <span>收起 ({totalSubCount})</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3 text-zinc-400" />
              <span>展开 ({totalSubCount})</span>
            </>
          )}
        </button>
      )}

      {hasChildren && (
        <Handle
          type="source"
          position={isTB ? Position.Bottom : Position.Right}
          className="!h-2 !w-2 !bg-zinc-400 !border-2 !border-white"
        />
      )}
    </div>
  );
}
