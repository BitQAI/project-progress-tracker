'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, ArrowRight, MessageSquareCode, Check } from 'lucide-react';
import { DecisionPointData, DecisionOptionItem } from '@/lib/decision-parser';

interface DecisionButtonGroupProps {
  data: DecisionPointData;
  onSelect: (prompt: string, item?: DecisionOptionItem) => void;
  disabled?: boolean;
}

export function DecisionButtonGroup({ data, onSelect, disabled }: DecisionButtonGroupProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!data || !data.items || data.items.length === 0) return null;

  const handleOptionClick = (item: DecisionOptionItem) => {
    if (disabled) return;
    setSelectedId(item.id);
    onSelect(item.prompt, item);
  };

  return (
    <div className="mt-3.5 pt-3 border-t border-zinc-100 text-left animate-fade-in">
      <div className="flex items-center gap-1.5 mb-2.5 text-zinc-800">
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <SlidersHorizontal className="h-2.5 w-2.5" />
        </div>
        <span className="text-[11px] font-semibold tracking-tight text-zinc-900">
          {data.title || '请选择您希望进一步聚焦的边界条件：'}
        </span>
      </div>

      <div className="space-y-2">
        {data.items.map((item, index) => {
          const badgeLetter = item.id || String.fromCharCode(65 + index);
          const isSelected = selectedId === item.id;

          return (
            <button
              key={item.id || index}
              type="button"
              onClick={() => handleOptionClick(item)}
              disabled={disabled}
              className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/90 shadow-2xs'
                  : 'border-blue-100/80 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 hover:shadow-xs group'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg font-bold text-[10px] shadow-3xs transition-transform mt-0.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white scale-105'
                    : 'bg-blue-600 text-white group-hover:scale-105'
                }`}
              >
                {isSelected ? <Check className="h-3 w-3" /> : badgeLetter}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'text-blue-900 font-bold'
                        : 'text-zinc-900 group-hover:text-blue-700'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isSelected ? (
                    <span className="text-[10px] font-medium text-blue-600 flex items-center gap-1 shrink-0 ml-1.5">
                      已选择
                    </span>
                  ) : (
                    <ArrowRight className="h-3 w-3 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-1.5" />
                  )}
                </div>
                {item.desc && (
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                    {item.desc}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[9px] text-zinc-400 px-1">
        <MessageSquareCode className="h-3 w-3 text-zinc-400 shrink-0" />
        <span>直接点击上方选项即可一键回传决策，或在下方输入框中自行输入具体要求</span>
      </div>
    </div>
  );
}
