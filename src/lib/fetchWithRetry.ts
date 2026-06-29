interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { retries = 3, retryDelay = 1500, ...fetchOptions } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      // Retry on server errors or network-like failures, not on 4xx client errors
      if (res.status >= 500) {
        const errorBody = await res.text().catch(() => 'Server error');
        throw new Error(`HTTP ${res.status}: ${errorBody}`);
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}
