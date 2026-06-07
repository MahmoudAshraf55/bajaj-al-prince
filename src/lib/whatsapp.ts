import makeWASocket, { DisconnectReason, useMultiFileAuthState, type WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

const AUTH_FOLDER = path.join(process.cwd(), '.baileys_auth');

export type WhatsAppStatus = 'initializing' | 'qr' | 'connecting' | 'connected' | 'disconnected';

interface WhatsAppState {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  phone: string | null;
  error: string | null;
}

const state: WhatsAppState = {
  status: 'initializing',
  qrDataUrl: null,
  phone: null,
  error: null,
};

let sock: WASocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

function ensureAuthFolder() {
  if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
  }
}

async function generateQR(qr: string): Promise<string> {
  return QRCode.toDataURL(qr, { width: 256, margin: 2, type: 'image/png' });
}

export async function initializeWhatsApp(): Promise<void> {
  if (sock) return;
  if (state.status === 'connecting') return;

  ensureAuthFolder();
  state.status = 'initializing';
  state.error = null;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- useMultiFileAuthState is a Baileys utility, not a React hook
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const socket = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      browser: ['BAJAJ AL PRINCE', 'Desktop', '1.0'],
      markOnlineOnConnect: false,
      keepAliveIntervalMs: 30000,
    });

    sock = socket;
    state.status = 'connecting';

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.status = 'qr';
        state.qrDataUrl = await generateQR(qr);
      }

      if (connection === 'open') {
        state.status = 'connected';
        state.qrDataUrl = null;
        state.error = null;
        const user = socket.user;
        if (user?.id) {
          state.phone = user.id.split(':')[0];
        }
      }

      if (connection === 'close') {
        const boomError = lastDisconnect?.error as Boom | undefined;
        const statusCode = boomError?.output?.statusCode;
        const errorMessage = boomError?.message ?? '';

        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isConflict = errorMessage.toLowerCase().includes('conflict') || errorMessage.toLowerCase().includes('replaced');

        sock = null;
        state.status = 'disconnected';
        state.qrDataUrl = null;
        state.phone = null;

        if (isConflict) {
          state.error = 'Your WhatsApp number is already connected from another device. Please disconnect the other session and scan QR again.';
          cleanupAuthFolder();
        } else if (isLoggedOut) {
          state.error = 'Session logged out. Please scan QR again.';
          cleanupAuthFolder();
        } else {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => initializeWhatsApp(), 5000);
        }
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    state.status = 'disconnected';
    state.error = message;
    sock = null;
  }
}

function cleanupAuthFolder() {
  try {
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
  } catch {
    // ignore cleanup errors
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try {
      await sock.logout();
    } catch {
      // ignore logout errors
    }
    sock = null;
  }
  cleanupAuthFolder();
  state.status = 'initializing';
  state.qrDataUrl = null;
  state.phone = null;
  state.error = null;
}

export function getWhatsAppState(): WhatsAppState {
  return { ...state };
}

export async function sendWhatsAppMessage(phone: string, text: string): Promise<{ success: boolean; error?: string }> {
  if (!sock || state.status !== 'connected') {
    return { success: false, error: 'WhatsApp is not connected' };
  }

  try {
    const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    return { success: false, error: message };
  }
}

// Lazy initialization — don't auto-start to avoid unnecessary overhead
export function ensureInitialized(): void {
  if (!sock && state.status === 'initializing') {
    initializeWhatsApp().catch(() => {
      // initialization errors are handled in state
    });
  }
}
