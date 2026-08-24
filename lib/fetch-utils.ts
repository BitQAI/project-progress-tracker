export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * 安全的 fetch json 工具，能够优雅捕获非 200 HTTP 响应或非 JSON 纯文本（如 "Rate exceeded." 或 HTML 报错页），
 * 避免抛出 Uncaught SyntaxError: Unexpected token 'R' ... 等致命未捕获异常。
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();

    let parsedData: any = null;
    let isJson = false;
    if (text) {
      try {
        parsedData = JSON.parse(text);
        isJson = true;
      } catch {
        isJson = false;
      }
    }

    if (!res.ok) {
      const errorMsg =
        (isJson && (parsedData?.error || parsedData?.message)) ||
        text ||
        `HTTP ${res.status} ${res.statusText}`;
      return {
        ok: false,
        status: res.status,
        error: errorMsg,
      };
    }

    if (isJson) {
      return {
        ok: true,
        status: res.status,
        data: parsedData as T,
      };
    }

    return {
      ok: false,
      status: res.status,
      error: text || 'Invalid response format',
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        error: 'Request aborted',
      };
    }
    const urlStr = typeof input === 'string' ? input : (input as any)?.url || 'unknown URL';
    console.warn(`[safeFetchJson] Fetch failed for ${urlStr}:`, err?.message || err);
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Network error',
    };
  }
}
