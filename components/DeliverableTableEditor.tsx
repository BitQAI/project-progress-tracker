'use client';

import React from 'react';
import { DeliverableItem } from '@/lib/types';
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, Sparkles } from 'lucide-react';

interface DeliverableTableEditorProps {
  items: DeliverableItem[];
  onChange: (items: DeliverableItem[]) => void;
  disabled?: boolean;
}

let delivCounter = 0;
function generateDelivId(): string {
  delivCounter += 1;
  return `deliv_item_${delivCounter}_${Math.random().toString(36).substring(2, 6)}`;
}

export function parseDeliverablesFromInput(
  reqText?: string,
  reqItems?: DeliverableItem[]
): DeliverableItem[] {
  if (Array.isArray(reqItems) && reqItems.length > 0) {
    return reqItems;
  }
  if (!reqText || !reqText.trim()) {
    return [{ id: generateDelivId(), name: '', requirement: '' }];
  }

  // 尝试按 JSON 解析
  if (reqText.trim().startsWith('[') && reqText.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(reqText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          id: item.id || generateDelivId(),
          name: item.name || '',
          requirement: item.requirement || '',
        }));
      }
    } catch {
      // ignore
    }
  }

  // 尝试按多行有序列表解析 (如 1. 名称 (说明) 或 1. 名称：说明)
  const lines = reqText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const list: DeliverableItem[] = [];
    lines.forEach((line) => {
      const clean = line.replace(/^\d+[\.\、\s]\s*/, '').replace(/^[•·\-*]\s*/, '');
      const matchParenthesis = clean.match(/^([^(（]+)(?:[(（](.*?)[)）])?$/);
      const matchColon = clean.match(/^([^：:]+)[：:](.*)$/);

      if (matchColon) {
        list.push({
          id: generateDelivId(),
          name: matchColon[1].trim(),
          requirement: matchColon[2].trim(),
        });
      } else if (matchParenthesis) {
        list.push({
          id: generateDelivId(),
          name: matchParenthesis[1].trim(),
          requirement: (matchParenthesis[2] || '').trim(),
        });
      } else {
        list.push({
          id: generateDelivId(),
          name: clean,
          requirement: '',
        });
      }
    });
    if (list.length > 0) return list;
  }

  return [{ id: generateDelivId(), name: reqText.trim(), requirement: '' }];
}

export function formatDeliverablesToText(items: DeliverableItem[]): string {
  const validItems = items.filter((i) => i.name.trim());
  if (validItems.length === 0) return '';
  return validItems
    .map((item, idx) => {
      const req = item.requirement?.trim();
      return `${idx + 1}. ${item.name.trim()}${req ? ` (${req})` : ''}`;
    })
    .join('\n');
}

const PRESET_DELIVERABLES = [
  { name: 'PRD文档', requirement: '附文档链接' },
  { name: 'UI设计稿', requirement: 'Figma标注' },
  { name: '技术方案', requirement: '接口与架构' },
  { name: '测试用例', requirement: '回归通过' },
];

export function DeliverableTableEditor({
  items,
  onChange,
  disabled = false,
}: DeliverableTableEditorProps) {
  const handleAddItem = (preset?: { name: string; requirement: string }) => {
    const newItem: DeliverableItem = {
      id: generateDelivId(),
      name: preset?.name || '',
      requirement: preset?.requirement || '',
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [{ id: generateDelivId(), name: '', requirement: '' }]);
  };

  const handleUpdateItem = (index: number, field: 'name' | 'requirement', val: string) => {
    const next = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: val };
      }
      return item;
    });
    onChange(next);
  };

  const handleMove = (index: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-1.5 rounded-lg border border-blue-200/80 bg-blue-50/30 p-2 text-xs">
      {/* 紧凑标题行与预设 */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-blue-150">
        <div className="flex items-center gap-1 font-semibold text-blue-900 text-[11px]">
          <FileText className="h-3 w-3 text-blue-600" />
          <span>交付件清单要求</span>
          <span className="text-[10px] text-blue-600 bg-blue-100/80 px-1 rounded">
            {items.filter((i) => i.name.trim()).length}项
          </span>
        </div>

        {!disabled && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-zinc-400 flex items-center">
              <Sparkles className="h-2.5 w-2.5 text-amber-500 mr-0.5" />快捷:
            </span>
            {PRESET_DELIVERABLES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleAddItem(p)}
                className="rounded bg-white border border-blue-200 px-1.5 py-0.2 text-[10px] text-blue-700 hover:bg-blue-50 transition-colors"
              >
                +{p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 极简紧凑行列表 */}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 bg-white p-1 rounded border border-zinc-200/90 shadow-2xs"
          >
            <span className="w-4 text-center font-mono text-[10px] text-zinc-400 font-bold shrink-0">
              {idx + 1}
            </span>
            <input
              type="text"
              disabled={disabled}
              value={item.name}
              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
              placeholder="交付件名称 *"
              className="w-1/3 min-w-[100px] rounded border border-zinc-200 bg-zinc-50/50 px-1.5 py-0.5 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
            />
            <input
              type="text"
              disabled={disabled}
              value={item.requirement || ''}
              onChange={(e) => handleUpdateItem(idx, 'requirement', e.target.value)}
              placeholder="验收标准/链接说明 (选填)"
              className="flex-1 min-w-[120px] rounded border border-zinc-200 bg-zinc-50/50 px-1.5 py-0.5 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-blue-500 text-xs"
            />
            {!disabled && (
              <div className="flex items-center gap-0.5 shrink-0">
                {items.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 rounded"
                      title="上移"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 rounded"
                      title="下移"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-0.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                  title="删除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部新增行 */}
      {!disabled && (
        <div className="pt-0.5 flex justify-between items-center">
          <button
            type="button"
            onClick={() => handleAddItem()}
            className="inline-flex items-center gap-1 rounded border border-dashed border-blue-400 bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Plus className="h-2.5 w-2.5" />
            <span>添加交付项</span>
          </button>
        </div>
      )}
    </div>
  );
}
