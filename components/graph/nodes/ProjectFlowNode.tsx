'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import Link from 'next/link';
import { ProjectNodeData } from '../types';
import { User, Calendar, AlertTriangle, ExternalLink, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

export function ProjectFlowNode({ data }: NodeProps & { data: ProjectNodeData }) {
  const { project, isExpanded, onToggleExpand, onSelectNode, direction = 'LR' } = data;
  const isTB = direction === 'TB';

  const hasChildren = (project.children && project.children.length > 0) || (project.tasks && project.tasks.length > 0);
  const totalSubCount = (project.children?.length || 0) + (project.tasks?.length || 0);

  // 状态显示配置
  const getStatusBadge = () => {
    switch (project.status) {
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200/60">进行中</span>;
      case 'done':
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/60">已完成</span>;
      case 'suspended':
        return <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200/60">已暂停</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 border border-zinc-200/60">未开始</span>;
    }
  };

  const getPriorityBadge = () => {
    const p = project.priority || 'P1';
    const styles: Record<string, string> = {
      P0: 'bg-rose-50 text-rose-700 border-rose-200',
      P1: 'bg-amber-50 text-amber-700 border-amber-200',
      P2: 'bg-blue-50 text-blue-700 border-blue-200',
      P3: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    };
    return (
      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold border ${styles[p] || styles.P1}`}>
        {p}
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelectNode(project.id, 'project', project)}
      className={`group relative w-[310px] cursor-pointer rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md ${
        project.hasOverdueTasks
          ? 'border-rose-300 ring-1 ring-rose-200 hover:border-rose-400'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <Handle
        type="target"
        position={isTB ? Position.Top : Position.Left}
        className="!h-2.5 !w-2.5 !bg-zinc-400 !border-2 !border-white"
      />

      {/* 头部：标题与状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            {getPriorityBadge()}
            {getStatusBadge()}
          </div>
          <h4 className="font-semibold text-zinc-900 text-sm truncate" title={project.name}>
            {project.name}
          </h4>
        </div>

        <Link
          href={`/projects/${project.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          title="打开项目看板"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {/* 进度条 */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
          <span>完成进度</span>
          <span className="font-medium text-zinc-800">
            {project.completedTasksCount}/{project.totalTasksCount} ({project.progressPercent}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              project.progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
            style={{ width: `${project.progressPercent}%` }}
          />
        </div>
      </div>

      {/* 底部信息条 */}
      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[11px] text-zinc-500">
        <div className="flex items-center gap-1">
          <User className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-medium text-zinc-700">{project.owner}</span>
        </div>

        {project.hasOverdueTasks && (
          <div className="flex items-center gap-1 text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>超期 {project.maxOverdueDays} 天</span>
          </div>
        )}

        {!project.hasOverdueTasks && project.latestDueDate && (
          <div className="flex items-center gap-1 text-zinc-500">
            <Calendar className="h-3 w-3 text-zinc-400" />
            <span>{project.latestDueDate.slice(5, 10)}</span>
          </div>
        )}
      </div>

      {/* 展开/折叠触发按钮 */}
      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(project.id);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-zinc-200 bg-zinc-50/70 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              <span>收起模块/任务 ({totalSubCount})</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
              <span>展开模块/任务 ({totalSubCount})</span>
            </>
          )}
        </button>
      )}

      {hasChildren && (
        <Handle
          type="source"
          position={isTB ? Position.Bottom : Position.Right}
          className="!h-2.5 !w-2.5 !bg-zinc-400 !border-2 !border-white"
        />
      )}
    </div>
  );
}
