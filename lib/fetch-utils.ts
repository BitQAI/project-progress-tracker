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
  init?: RequestInit,
  retries = 2
): Promise<SafeFetchResult<T>> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时保护

    try {
      const res = await fetch(input, {
        ...init,
        signal: init?.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      // 如果是 502/503 或网络层面的报错且还有重试次数，则重试
      if ((res.status === 502 || res.status === 503) && attempt < retries) {
        console.warn(`[safeFetchJson] Attempt ${attempt + 1} failed with status ${res.status}, retrying...`, input);
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }

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
      clearTimeout(timeoutId);
      lastError = err;

      if (err?.name === 'AbortError') {
        return {
          ok: false,
          status: 0,
          error: 'Request timeout or aborted',
        };
      }

      // 如果是网络连接错误 (TypeError: Failed to fetch) 且还有重试次数，则重试
      if (err instanceof TypeError && attempt < retries) {
        console.warn(`[safeFetchJson] Network attempt ${attempt + 1} failed for ${input}: ${err.message}, retrying...`);
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }

      break;
    }
  }

  const urlStr = typeof input === 'string' ? input : (input as any)?.url || 'unknown URL';
  return {
    ok: false,
    status: 0,
    error: `Fetch request failed for ${urlStr}: ${lastError?.message || 'Network error'}`,
  };
}

/**
 * 安全的 fetch text 工具，带自动重试机制
 */
export async function safeFetchText(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 2
): Promise<SafeFetchResult<string>> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(input, {
        ...init,
        signal: init?.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if ((res.status === 502 || res.status === 503) && attempt < retries) {
        console.warn(`[safeFetchText] Attempt ${attempt + 1} failed with status ${res.status}, retrying...`, input);
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }

      const text = await res.text();

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: text || `HTTP error ${res.status}`,
        };
      }

      return { ok: true, status: res.status, data: text };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err?.name === 'AbortError') {
        return {
          ok: false,
          status: 0,
          error: 'Request timeout or aborted',
        };
      }

      if (err instanceof TypeError && attempt < retries) {
        console.warn(`[safeFetchText] Network attempt ${attempt + 1} failed for ${input}: ${err.message}, retrying...`);
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }

      break;
    }
  }

  const urlStr = typeof input === 'string' ? input : (input as any)?.url || 'unknown URL';
  return {
    ok: false,
    status: 0,
    error: `Fetch request failed for ${urlStr}: ${lastError?.message || 'Network error'}`,
  };
}
