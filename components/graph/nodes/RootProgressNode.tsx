'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RootNodeData } from '../types';
import { Activity, ShieldAlert, CheckCircle2, Clock, FolderGit2, ChevronDown, ChevronRight } from 'lucide-react';

export function RootProgressNode({ data }: NodeProps & { data: RootNodeData }) {
  const { title = '项目进度管理', metrics, isAllExpanded, onToggleAll, onSelectNode, direction = 'LR' } = data;
  const isTB = direction === 'TB';

  return (
    <div
      onClick={() => onSelectNode?.('root', 'root')}
      className="group relative w-[350px] cursor-pointer rounded-xl border-2 border-zinc-900 bg-white p-4 shadow-md transition-all hover:border-zinc-700 hover:shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                Global Root
              </span>
            </div>
            <h3 className="font-bold text-zinc-900 text-base leading-tight mt-0.5">{title}</h3>
          </div>
        </div>

        {onToggleAll && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAll();
            }}
            className="flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            title={isAllExpanded ? '一键折叠所有项目' : '一键展开所有项目'}
          >
            {isAllExpanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>收起全部</span>
              </>
            ) : (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>展开全部</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 综合进度条 */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-zinc-600 mb-1">
          <span className="font-medium text-zinc-700">综合完成率</span>
          <span className="font-bold text-zinc-900">{metrics.averageProgress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, metrics.averageProgress))}%` }}
          />
        </div>
      </div>

      {/* 核心指标 4 格 */}
      <div className="mt-3.5 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg bg-zinc-50 p-2 border border-zinc-100">
          <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-700 mb-0.5">
            <FolderGit2 className="h-3 w-3 text-zinc-500" />
            <span>总项目</span>
          </div>
          <span className="text-sm font-bold text-zinc-900">{metrics.totalProjects}</span>
        </div>

        <div className="rounded-lg bg-blue-50/70 p-2 border border-blue-100">
          <div className="flex items-center justify-center gap-1 text-[11px] text-blue-700 mb-0.5">
            <Clock className="h-3 w-3 text-blue-500" />
            <span>进行中</span>
          </div>
          <span className="text-sm font-bold text-blue-900">{metrics.inProgressCount}</span>
        </div>

        <div className="rounded-lg bg-emerald-50/70 p-2 border border-emerald-100">
          <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-700 mb-0.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>已完成</span>
          </div>
          <span className="text-sm font-bold text-emerald-900">{metrics.doneCount}</span>
        </div>

        <div className={`rounded-lg p-2 border ${metrics.overdueProjectsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-zinc-50 border-zinc-100'}`}>
          <div className="flex items-center justify-center gap-1 text-[11px] text-rose-700 mb-0.5">
            <ShieldAlert className="h-3 w-3 text-rose-500" />
            <span>逾期风险</span>
          </div>
          <span className={`text-sm font-bold ${metrics.overdueProjectsCount > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
            {metrics.overdueProjectsCount}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={isTB ? Position.Bottom : Position.Right}
        className="!h-3 !w-3 !bg-zinc-900 !border-2 !border-white"
      />
    </div>
  );
}
