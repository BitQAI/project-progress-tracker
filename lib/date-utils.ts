/**
 * 东八区 (UTC+8 / Asia/Shanghai) 统一时间工具库
 */

/**
 * 获取东八区今天的日期字符串 (YYYY-MM-DD)
 */
export function getTodayBeijingString(): string {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // 转换形如 '2026/08/19' -> '2026-08-19'
  return formatter.format(d).replace(/\//g, '-');
}

/**
 * 格式化时间为东八区完整日期时间 (YYYY-MM-DD HH:mm)
 */
export function formatBeijingDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d).replace(/\//g, '-');
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
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d).replace(/\//g, '-');
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
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d).replace(/\//g, '-');
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
