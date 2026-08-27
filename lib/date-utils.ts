/**
 * 东八区 (UTC+8 / Asia/Shanghai) 统一时间工具库
 */

/**
 * 获取东八区今天的日期字符串 (YYYY-MM-DD)
 */
export function getTodayBeijingString(): string {
  const d = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch {
    // 降级方案
    const iso = d.toISOString(); // 虽然是 UTC，但作为一个极端的 fallback
    return iso.split('T')[0];
  }
}

/**
 * 规范化完成时间/提交时间的 ISO 时间戳：
 * 1. 若包含 'T'，说明携带了具体时刻，直接使用；
 * 2. 若为 YYYY-MM-DD 日期字符串：
 *    - 如果是【今天】(东八区今天的日期)，说明是在今天点击/提交，直接采用当前实时时刻 (new Date().toISOString())；
 *    - 如果是【非今天】(如补录过去或未来日期)，设置为东八区中午 12:00:00 (即 UTC 04:00:00.000Z)，避免误加 T12:00:00.000Z 导致东八区显示为晚上 20:00。
 */
export function normalizeDoneAtTimestamp(inputDateStr?: string | null): string {
  if (!inputDateStr) return new Date().toISOString();
  if (inputDateStr.includes('T')) return inputDateStr;

  const todayStr = getTodayBeijingString();
  if (inputDateStr === todayStr) {
    return new Date().toISOString();
  }

  return `${inputDateStr}T04:00:00.000Z`;
}

/**
 * 格式化时间为东八区完整日期时间 (YYYY-MM-DD HH:mm)
 */
export function formatBeijingDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    const hour = parts.find((p) => p.type === 'hour')?.value;
    const minute = parts.find((p) => p.type === 'minute')?.value;
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * 格式化时间为东八区短日期时间 (MM-DD HH:mm)
 */
export function formatBeijingShortDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    const hour = parts.find((p) => p.type === 'hour')?.value;
    const minute = parts.find((p) => p.type === 'minute')?.value;
    
    return `${month}-${day} ${hour}:${minute}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * 格式化时间为东八区日期 (YYYY-MM-DD)
 */
export function formatBeijingDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * 东八区相对时间 / 业务时间 (刚刚、X分钟前、今天 HH:mm、昨天 HH:mm、M月D日)
 */
export function formatBeijingRelativeTime(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    const todayStr = getTodayBeijingString();
    const targetDateStr = formatBeijingDate(d);
    const timeStr = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);

    if (diffMins < 5 && diffMins >= 0) return '刚刚';
    if (diffMins < 60 && diffMins >= 5) return `${diffMins} 分钟前`;
    if (targetDateStr === todayStr) {
      return `今天 ${timeStr}`;
    }

    // 昨天
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = formatBeijingDate(yesterday);
    if (targetDateStr === yesterdayStr) {
      return `昨天 ${timeStr}`;
    }

    const monthDayStr = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'numeric',
      day: 'numeric',
    }).format(d);
    return `${monthDayStr} ${timeStr}`;
  } catch {
    return ts;
  }
}

export interface DueDateRiskInfo {
  isOverdue: boolean;
  isDueSoon: boolean;
  hasRisk: boolean;
  diffDays: number;
  label: string;
}

/**
 * 计算截止日期相对于东八区今天的风险与过期状态
 * diffDays < 0: 已过期/延期
 * diffDays === 0: 今日到期 (1天内)
 * diffDays === 1: 明日到期 (1天内)
 * diffDays > 1: 正常进行中
 */
export function getDueDateRiskInfo(dueDateStr?: string | null): DueDateRiskInfo {
  if (!dueDateStr || !dueDateStr.trim()) {
    return {
      isOverdue: false,
      isDueSoon: false,
      hasRisk: false,
      diffDays: 999,
      label: '未排期',
    };
  }

  const cleanDueStr = dueDateStr.trim().slice(0, 10);
  const todayStr = getTodayBeijingString();

  const dDue = new Date(cleanDueStr + 'T00:00:00').getTime();
  const dToday = new Date(todayStr + 'T00:00:00').getTime();

  if (isNaN(dDue) || isNaN(dToday)) {
    return {
      isOverdue: false,
      isDueSoon: false,
      hasRisk: false,
      diffDays: 999,
      label: dueDateStr,
    };
  }

  const diffDays = Math.round((dDue - dToday) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      isOverdue: true,
      isDueSoon: false,
      hasRisk: true,
      diffDays,
      label: `延期 ${overdueDays} 天`,
    };
  } else if (diffDays === 0) {
    return {
      isOverdue: false,
      isDueSoon: true,
      hasRisk: true,
      diffDays,
      label: '今日到期',
    };
  } else if (diffDays === 1) {
    return {
      isOverdue: false,
      isDueSoon: true,
      hasRisk: true,
      diffDays,
      label: '明日到期 (1天内)',
    };
  } else {
    return {
      isOverdue: false,
      isDueSoon: false,
      hasRisk: false,
      diffDays,
      label: `剩余 ${diffDays} 天`,
    };
  }
}
