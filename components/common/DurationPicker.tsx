'use client';

import React, { useMemo } from 'react';
import {
  DurationUnit,
  DURATION_UNITS,
  DURATION_PRESETS,
  splitDuration,
  formatDuration,
} from '@/lib/duration-utils';
import { Clock, X } from 'lucide-react';

interface DurationPickerProps {
  value?: string;
  onChange: (val: string) => void;
  idPrefix?: string;
  disabled?: boolean;
}

export const DurationPicker: React.FC<DurationPickerProps> = ({
  value,
  onChange,
  idPrefix = 'duration',
  disabled = false,
}) => {
  const { value: parsedNum, unit: parsedUnit } = useMemo(() => {
    return splitDuration(value);
  }, [value]);

  const handleNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0) {
      onChange('');
    } else {
      onChange(formatDuration(num, parsedUnit));
    }
  };

  const handleUnitChange = (newUnit: DurationUnit) => {
    const num = parsedNum === '' ? 1 : parsedNum;
    onChange(formatDuration(num, newUnit));
  };

  const handlePresetClick = (preset: string) => {
    if (disabled) return;
    onChange(preset);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
  };

  const currentDisplay = value?.trim() ? value : '未设定周期';

  return (
    <div className="space-y-2 text-sm">
      {/* 组合输入行：数值输入 + 单位选择 + 清空按钮 */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="number"
            id={`${idPrefix}-value`}
            step="0.5"
            min="0.5"
            disabled={disabled}
            value={parsedNum}
            onChange={handleNumChange}
            placeholder="数值，如 2.5"
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-50"
          />
          <Clock className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* 单位切换 */}
        <select
          id={`${idPrefix}-unit`}
          disabled={disabled}
          value={parsedUnit}
          onChange={(e) => handleUnitChange(e.target.value as DurationUnit)}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer disabled:opacity-50"
        >
          {DURATION_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>

        {/* 清除按钮 */}
        {value?.trim() && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="清空周期设定"
            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 快捷药丸选择区 */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-xs text-slate-400 select-none mr-0.5">快捷:</span>
        {DURATION_PRESETS.map((preset) => {
          const isSelected = value === preset;
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetClick(preset)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium dark:bg-indigo-950/50 dark:border-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60'
              } disabled:opacity-50`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      {/* 实时生效提示 */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
        <span>允许 0.5 等半数粒度</span>
        <span className="font-mono text-slate-600 dark:text-slate-300">
          已设: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentDisplay}</span>
        </span>
      </div>
    </div>
  );
};
