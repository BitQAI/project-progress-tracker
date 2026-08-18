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
  { name: 'PRD需求文档', requirement: '需业务方评审通过并附文档链接' },
  { name: '交互设计稿', requirement: 'Figma高保真交互与标注链接' },
  { name: '技术方案设计', requirement: '包含接口定义与数据库变更评审' },
  { name: '测试用例与报告', requirement: '主流程100%覆盖并通过回归' },
  { name: '上线发布说明', requirement: '附灰度观察数据与验收确认' },
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
    <div className="space-y-2.5 rounded-xl border border-blue-200 bg-blue-50/30 p-3 text-xs">
      {/* 顶部标题与快捷预设 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-1 border-b border-blue-200/60">
        <div className="flex items-center gap-1.5 font-semibold text-blue-950">
          <FileText className="h-3.5 w-3.5 text-blue-600" />
          <span>交付件清单规范（有序表格）</span>
          <span className="rounded bg-blue-100/90 text-blue-700 px-1.5 py-0.2 text-[10px] font-mono">
            共 {items.filter((i) => i.name.trim()).length} 项
          </span>
        </div>

        {/* 常用交付件快捷预设 */}
        {!disabled && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-zinc-500 flex items-center gap-0.5">
              <Sparkles className="h-2.5 w-2.5 text-amber-500" /> 快捷添加:
            </span>
            {PRESET_DELIVERABLES.slice(0, 3).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleAddItem(p)}
                className="rounded bg-white border border-blue-200/90 px-1.5 py-0.5 text-[10px] text-blue-700 hover:bg-blue-100/80 transition-colors"
              >
                + {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 有序表格 */}
      <div className="overflow-hidden rounded-lg border border-blue-200/90 bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] text-zinc-600 font-semibold select-none">
              <th className="w-10 px-2.5 py-1.5 text-center">序号</th>
              <th className="w-2/5 px-2.5 py-1.5">交付件名称 / 成果项 <span className="text-rose-500">*</span></th>
              <th className="px-2.5 py-1.5">交付标准 / 验收说明 / 格式链接要求</th>
              {!disabled && <th className="w-16 px-2 py-1.5 text-center">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150">
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                <td className="px-2.5 py-1.5 text-center font-mono text-[11px] text-zinc-400 font-bold">
                  {idx + 1}
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    disabled={disabled}
                    value={item.name}
                    onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                    placeholder={`交付件 ${idx + 1} 名称 (如: 产品PRD / UI设计稿)`}
                    className="w-full rounded border border-zinc-250 bg-white px-2 py-1 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 font-medium text-xs"
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    disabled={disabled}
                    value={item.requirement || ''}
                    onChange={(e) => handleUpdateItem(idx, 'requirement', e.target.value)}
                    placeholder="选填：验收标准或链接要求 (如: 需附飞书文档链接)"
                    className="w-full rounded border border-zinc-250 bg-white px-2 py-1 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </td>
                {!disabled && (
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {items.length > 1 && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, 'up')}
                            className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded hover:bg-zinc-100"
                            title="上移"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === items.length - 1}
                            onClick={() => handleMove(idx, 'down')}
                            className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded hover:bg-zinc-100"
                            title="下移"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                        title="删除此行"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部新增行按钮 */}
      {!disabled && (
        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={() => handleAddItem()}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-blue-400 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50/80 transition-colors shadow-2xs"
          >
            <Plus className="h-3 w-3" />
            <span>添加一行交付件</span>
          </button>
          <span className="text-[11px] text-zinc-500">
            完成任务时需逐一核对/归档交付件成果
          </span>
        </div>
      )}
    </div>
  );
}
