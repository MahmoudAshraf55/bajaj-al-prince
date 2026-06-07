const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export type WhatsAppStatus = 'initializing' | 'qr' | 'connecting' | 'connected' | 'disconnected';

interface WhatsAppState {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  phone: string | null;
  error: string | null;
}

export async function getWhatsAppStateFromService(): Promise<WhatsAppState> {
  const res = await fetch(`${SERVICE_URL}/status`, { cache: 'no-store' });
  const data = await res.json();
  if (data.success) return data.data as WhatsAppState;
  throw new Error(data.error || 'Failed to get status');
}

export async function disconnectWhatsAppViaService(): Promise<void> {
  const res = await fetch(`${SERVICE_URL}/disconnect`, { method: 'POST', cache: 'no-store' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to disconnect');
}

export async function sendWhatsAppMessageViaService(phone: string, text: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${SERVICE_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message: text }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (data.success) return { success: true };
  return { success: false, error: data.error || 'Failed to send' };
}
