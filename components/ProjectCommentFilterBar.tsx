'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { getAttachmentFormatIcon } from './AttachmentBadgeList';

interface ProjectCommentFilterBarProps {
  searchText: string;
  onSearchTextChange: (val: string) => void;
  filterNodeId: string;
  onFilterNodeIdChange: (val: string) => void;
  allNodes: { id: string; name: string }[];
  onlyHasAttachments: boolean;
  filterAttachmentType: 'all' | 'image' | 'pdf' | 'md' | 'other';
  onFilterTypeChange: (hasAtt: boolean, type: 'all' | 'image' | 'pdf' | 'md' | 'other') => void;
  matchCount: number;
}

export function ProjectCommentFilterBar({
  searchText,
  onSearchTextChange,
  filterNodeId,
  onFilterNodeIdChange,
  allNodes,
  onlyHasAttachments,
  filterAttachmentType,
  onFilterTypeChange,
  matchCount,
}: ProjectCommentFilterBarProps) {
  return (
    <div className="border-b border-zinc-150 bg-zinc-50/70 p-3 shrink-0 space-y-2.5">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* 模糊搜索 */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索留言内容、记录人..."
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-zinc-200 bg-white text-xs placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          />
          {searchText && (
            <button
              onClick={() => onSearchTextChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
            >
              清除
            </button>
          )}
        </div>

        {/* 按 WBS 分组过滤 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">WBS 模块:</span>
          <select
            aria-label="按WBS模块筛选留言"
            value={filterNodeId}
            onChange={(e) => onFilterNodeIdChange(e.target.value)}
            className="h-8 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:border-zinc-400 px-2 min-w-[120px] max-w-[200px] truncate"
          >
            <option value="all">显示全部模块</option>
            {allNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        {/* 附件类型细化筛选 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFilterTypeChange(false, 'all')}
            className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              !onlyHasAttachments && filterAttachmentType === 'all'
                ? 'bg-zinc-150 text-zinc-850 border-zinc-300 shadow-3xs'
                : 'bg-white text-zinc-600 border-zinc-250 hover:bg-zinc-50'
            }`}
          >
            全部留言
          </button>
          <button
            onClick={() => onFilterTypeChange(true, 'all')}
            className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              onlyHasAttachments && filterAttachmentType === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-zinc-600 border-zinc-250 hover:bg-zinc-50'
            }`}
          >
            仅看含附件
          </button>

          <div className="h-4 w-px bg-zinc-250 mx-1 hidden sm:block" />

          {/* 格式标签过滤 */}
          {(['image', 'pdf', 'md'] as const).map((type) => {
            const label = type === 'image' ? '图片凭证' : type === 'pdf' ? 'PDF文档' : 'Markdown';
            const active = onlyHasAttachments && filterAttachmentType === type;
            return (
              <button
                key={type}
                onClick={() => onFilterTypeChange(true, type)}
                className={`h-7 px-2 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {getAttachmentFormatIcon(type)}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 匹配项数量 */}
        <span className="text-[11px] font-medium text-zinc-500">
          已筛选出 <strong className="text-zinc-800">{matchCount}</strong> 条留言
        </span>
      </div>
    </div>
  );
}
