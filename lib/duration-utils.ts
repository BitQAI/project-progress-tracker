/**
 * 周期推断、格式转换与拆解工具库
 * 支持日（天）、周、月（个月），允许 0.5 等半数粒度
 */

export type DurationUnit = '天' | '周' | '个月';

export const DURATION_UNITS: { label: string; value: DurationUnit }[] = [
  { label: '天', value: '天' },
  { label: '周', value: '周' },
  { label: '个月', value: '个月' },
];

export const DURATION_PRESETS = [
  '0.5天',
  '1天',
  '1周',
  '1.5周',
  '1个月',
];

/**
 * 智能推断与规范化周期字符串
 * 针对历史存量数据（如 "1", "3-4天", "36人天", "半天", "2周", "8周 (Q3-Q4)" 等）
 * 转换为统一规范格式：`${数字}${单位}`，如 "1天"、"3.5天"、"36天"、"0.5天"、"1.5周"、"1个月"
 */
export function inferAndNormalizeDuration(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let str = raw.trim();
  if (!str || str === '未设定' || str === '未设置' || str === 'null' || str === 'undefined') {
    return null;
  }

  // 去除前导辅助字，如 "暂定"、"约"、"预估"
  str = str.replace(/^(暂定|约|预估|大概|共)\s*/, '').trim();

  // 1. 处理范围表达，如 "3-4天", "2~3天", "1-2周", "2-3"
  const rangeMatch = str.match(/^([0-9]+(?:\.[0-9]+)?)\s*[-~至到/]\s*([0-9]+(?:\.[0-9]+)?)\s*(天|日|周|月|个月|人天)?$/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    const avg = Math.round(((min + max) / 2) * 2) / 2; // 0.5 精度
    const rawUnit = rangeMatch[3];
    let unit: DurationUnit = '天';
    if (rawUnit === '周') unit = '周';
    else if (rawUnit === '月' || rawUnit === '个月') unit = '个月';
    return `${avg}${unit}`;
  }

  // 2. 特殊中文字面量处理
  if (str === '半天' || str === '0.5' || str === '0.5d') return '0.5天';
  if (str === '一天' || str === '1d') return '1天';
  if (str === '两天' || str === '2d') return '2天';
  if (str === '三天' || str === '3d') return '3天';
  if (str === '一周' || str === '1w') return '1周';
  if (str === '两周' || str === '2w') return '2周';
  if (str === '一个月' || str === '一月' || str === '1m') return '1个月';

  // 3. 处理纯数字（任务通常默认单位为天）
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(str)) {
    const num = parseFloat(str);
    return `${num}天`;
  }

  // 4. 处理人天格式，如 "36人天" -> "36天"
  const personDayMatch = str.match(/^([0-9]+(?:\.[0-9]+)?)\s*人天/);
  if (personDayMatch) {
    return `${parseFloat(personDayMatch[1])}天`;
  }

  // 5. 处理小时格式，如 "4h"、"4小时" -> 转换为天（8小时制，步长0.5）
  const hourMatch = str.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:h|小时|个工作小时)/i);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    const days = Math.max(0.5, Math.round((hours / 8) * 2) / 2);
    return `${days}天`;
  }

  // 6. 提取数字与单位（兼容附加说明，如 "8周 (Q3-Q4)"、"2.5天左右"）
  const numUnitMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(天|日|工作日|周|个周|月|个月)/);
  if (numUnitMatch) {
    const val = parseFloat(numUnitMatch[1]);
    const u = numUnitMatch[2];
    if (u === '周' || u === '个周') {
      return `${val}周`;
    }
    if (u === '月' || u === '个月') {
      return `${val}个月`;
    }
    return `${val}天`;
  }

  // 若为非标准时间字符串（如 "2026Q3"），原样保留返回
  return str;
}

/**
 * 将周期字符串拆解为数值和单位，供控件回填
 */
export function splitDuration(durationStr: string | null | undefined): {
  value: number | '';
  unit: DurationUnit;
} {
  const norm = inferAndNormalizeDuration(durationStr);
  if (!norm) {
    return { value: '', unit: '天' };
  }

  const match = norm.match(/^([0-9]+(?:\.[0-9]+)?)\s*(天|周|个月)$/);
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2] as DurationUnit,
    };
  }

  return { value: '', unit: '天' };
}

/**
 * 将数值与单位组合为标准周期格式
 */
export function formatDuration(value: number | '' | undefined | null, unit: DurationUnit = '天'): string {
  if (value === '' || value === undefined || value === null || isNaN(Number(value))) {
    return '';
  }
  const num = Number(value);
  if (num <= 0) return '';
  return `${num}${unit}`;
}
