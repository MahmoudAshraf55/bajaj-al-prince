const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export type WhatsAppStatus = 'initializing' | 'qr' | 'connecting' | 'connected' | 'disconnected';

interface WhatsAppState {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  phone: string | null;
  error: string | null;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (err) {
      const isLast = attempt === retries;
      if (isLast) throw err;
      const wait = Math.pow(2, attempt) * 500;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

export async function getWhatsAppStateFromService(): Promise<WhatsAppState> {
  const res = await fetchWithRetry(`${SERVICE_URL}/status`, { cache: 'no-store' });
  const data = await res.json();
  if (data.success) return data.data as WhatsAppState;
  throw new Error(data.error || 'Failed to get status');
}

export async function disconnectWhatsAppViaService(): Promise<void> {
  const res = await fetchWithRetry(`${SERVICE_URL}/disconnect`, { method: 'POST', cache: 'no-store' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to disconnect');
}

export async function sendWhatsAppMessageViaService(phone: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithRetry(`${SERVICE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: text }),
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.success) return { success: true };
    return { success: false, error: data.error || 'Failed to send' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: message };
  }
}
