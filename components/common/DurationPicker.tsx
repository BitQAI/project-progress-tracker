'use client';

import React, { useMemo } from 'react';
import {
  DurationUnit,
  DURATION_UNITS,
  DURATION_PRESETS,
  splitDuration,
  formatDuration,
} from '@/lib/duration-utils';
import { X } from 'lucide-react';

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

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {/* 紧凑数字输入框 */}
      <input
        type="number"
        id={`${idPrefix}-value`}
        step="0.5"
        min="0.5"
        disabled={disabled}
        value={parsedNum}
        onChange={handleNumChange}
        placeholder="数值"
        className="w-16 sm:w-20 h-8 px-2 py-1 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
      />

      {/* 单位切换下拉 */}
      <select
        id={`${idPrefix}-unit`}
        disabled={disabled}
        value={parsedUnit}
        onChange={(e) => handleUnitChange(e.target.value as DurationUnit)}
        className="h-8 px-1.5 py-1 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:opacity-50"
      >
        {DURATION_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>

      {/* 竖分割线 */}
      <div className="h-4 w-px bg-zinc-200 mx-0.5 shrink-0 hidden xs:block" />

      {/* 快捷预设按钮：0.5天、1天、1周、1.5周、1个月 */}
      <div className="flex items-center gap-1 shrink-0">
        {DURATION_PRESETS.map((preset) => {
          const isSelected = value === preset;
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetClick(preset)}
              className={`h-8 px-2 text-xs rounded-md border transition-colors whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
              } disabled:opacity-50`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      {/* 清除按钮 */}
      {value?.trim() && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          title="清空周期"
          className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
