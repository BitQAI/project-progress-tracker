'use client';

import React from 'react';
import { ProjectActivityItem } from '@/lib/types';

interface GitDiffViewProps {
  rawText?: string;
  type?: ProjectActivityItem['type'];
  title?: string;
}

interface ParsedDiffLine {
  id: string;
  type: 'add' | 'del' | 'header' | 'normal';
  label?: string;
  content: string;
}

export function GitDiffView({ rawText, type }: GitDiffViewProps) {
  if (!rawText || !rawText.trim()) return null;

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const parsedLines: ParsedDiffLine[] = [];

  lines.forEach((line, idx) => {
    // 1. 显式新增行 (+ ...)
    if (line.startsWith('+ ') || line.startsWith('+')) {
      const text = line.replace(/^\+\s*/, '');
      parsedLines.push({
        id: `diff_${idx}`,
        type: 'add',
        content: text,
      });
      return;
    }

    // 2. 显式删除行 (- ...)
    if (line.startsWith('- ') || line.startsWith('-')) {
      const text = line.replace(/^-\s*/, '');
      parsedLines.push({
        id: `diff_${idx}`,
        type: 'del',
        content: text,
      });
      return;
    }

    // 3. Diff区块头 (@@ ... @@ 或 【...】)
    if (line.startsWith('@@') || (line.startsWith('【') && line.endsWith('】'))) {
      parsedLines.push({
        id: `diff_${idx}`,
        type: 'header',
        content: line,
      });
      return;
    }

    // 4. 兼容解析旧版变更文案：由「A」修改为「B」 / 由 A 变更为 B / 由 A 调整为 B
    const legacyDiffMatch = line.match(
      /^(?:[•·\-*]\s*)?([^：:]+)[：:]\s*由\s*[「"“]?(.*?)[」"”]?\s*(?:修改为|变更为|调整为)\s*[「"“]?(.*?)[」"”]?$/
    );
    if (legacyDiffMatch) {
      const field = legacyDiffMatch[1].trim();
      const oldVal = legacyDiffMatch[2].trim() || '（空）';
      const newVal = legacyDiffMatch[3].trim() || '（空）';
      parsedLines.push({
        id: `diff_${idx}_del`,
        type: 'del',
        content: `${field}: ${oldVal}`,
      });
      parsedLines.push({
        id: `diff_${idx}_add`,
        type: 'add',
        content: `${field}: ${newVal}`,
      });
      return;
    }

    // 5. 根据事件类型自动推导：创建类全为新增(+)，删除类全为删除(-)
    if (type === 'task_created' || type === 'node_created' || type === 'project_created') {
      const cleanLine = line.replace(/^[•·\-*]\s*/, '');
      parsedLines.push({
        id: `diff_${idx}`,
        type: 'add',
        content: cleanLine,
      });
      return;
    }

    if (type === 'task_deleted' || type === 'node_deleted') {
      const cleanLine = line.replace(/^[•·\-*]\s*/, '');
      parsedLines.push({
        id: `diff_${idx}`,
        type: 'del',
        content: cleanLine,
      });
      return;
    }

    // 6. 普通文本行
    parsedLines.push({
      id: `diff_${idx}`,
      type: 'normal',
      content: line.replace(/^[•·\-*]\s*/, ''),
    });
  });

  return (
    <div className="mt-1.5 overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-50/50 shadow-2xs font-mono text-[11px]">
      {/* Diff 内容行列表 */}
      <div className="divide-y divide-zinc-200/50">
        {parsedLines.map((item) => {
          if (item.type === 'del') {
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 bg-rose-50/95 px-2 py-1 text-rose-950 border-l-[3px] border-rose-500 hover:bg-rose-100/90 transition-colors"
              >
                <span className="select-none font-bold text-rose-600 shrink-0 w-3 text-center text-xs">
                  -
                </span>
                <span className="flex-1 break-words font-medium line-through decoration-rose-400 decoration-1">
                  {item.content}
                </span>
              </div>
            );
          }

          if (item.type === 'add') {
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 bg-emerald-50/95 px-2 py-1 text-emerald-950 border-l-[3px] border-emerald-500 hover:bg-emerald-100/90 transition-colors"
              >
                <span className="select-none font-bold text-emerald-600 shrink-0 w-3 text-center text-xs">
                  +
                </span>
                <span className="flex-1 break-words font-medium">
                  {item.content}
                </span>
              </div>
            );
          }

          if (item.type === 'header') {
            return (
              <div
                key={item.id}
                className="bg-zinc-100/90 px-2.5 py-0.5 text-zinc-500 font-semibold text-[10px] tracking-wide"
              >
                {item.content}
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="flex items-start gap-2 bg-white/70 px-2.5 py-1 text-zinc-700"
            >
              <span className="select-none text-zinc-300 shrink-0 w-3 text-center">·</span>
              <span className="flex-1 break-words">{item.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
