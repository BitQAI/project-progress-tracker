'use client';

import React from 'react';
import { Compass, ArrowRight, MessageSquareCode } from 'lucide-react';

export interface ClarifyOptionItem {
  id: string; // 如 "A", "B", "C"
  label: string;
  desc?: string;
  prompt: string;
}

export interface ClarifyOptionsData {
  title?: string;
  items: ClarifyOptionItem[];
}

interface ChatOptionsProps {
  data: ClarifyOptionsData;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function ChatOptions({ data, onSelect, disabled }: ChatOptionsProps) {
  if (!data || !data.items || data.items.length === 0) return null;

  return (
    <div className="mt-3.5 pt-3 border-t border-zinc-100/90 text-left">
      <div className="flex items-center gap-1.5 mb-2.5 text-zinc-700">
        <Compass className="h-3.5 w-3.5 text-blue-600 animate-spin-slow" />
        <span className="text-[11px] font-semibold tracking-tight">
          {data.title || '请选择您希望进一步聚焦的边界条件：'}
        </span>
      </div>

      <div className="space-y-2">
        {data.items.map((item, index) => {
          const badgeLetter = item.id || String.fromCharCode(65 + index);
          return (
            <button
              key={item.id || index}
              onClick={() => !disabled && onSelect(item.prompt)}
              disabled={disabled}
              className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border border-blue-100/80 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 hover:shadow-xs transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-[10px] shadow-3xs group-hover:scale-105 transition-transform mt-0.5">
                {badgeLetter}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 group-hover:text-blue-700 transition-colors">
                    {item.label}
                  </span>
                  <ArrowRight className="h-3 w-3 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-1.5" />
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
        <span>点击上方选项一键下钻，或在下方输入框中自行输入具体要求</span>
      </div>
    </div>
  );
}
