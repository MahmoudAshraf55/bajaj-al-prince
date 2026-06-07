import express from 'express';
import cors from 'cors';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FOLDER = path.join(__dirname, '.baileys_auth');
const PORT = process.env.WHATSAPP_SERVICE_PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let reconnectTimer = null;
let state = {
  status: 'initializing',
  qrDataUrl: null,
  phone: null,
  error: null,
};

function ensureAuthFolder() {
  if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
  }
}

async function generateQR(qr) {
  return QRCode.toDataURL(qr, { width: 256, margin: 2, type: 'image/png' });
}

async function initializeWhatsApp() {
  if (sock) return;
  if (state.status === 'connecting') return;

  ensureAuthFolder();
  state.status = 'initializing';
  state.error = null;

  try {
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
        const boomError = lastDisconnect?.error;
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
    state.status = 'disconnected';
    state.error = err.message || 'Unknown error';
    sock = null;
  }
}

function cleanupAuthFolder() {
  try {
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
}

async function disconnectWhatsApp() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try {
      await sock.logout();
    } catch {
      // ignore
    }
    sock = null;
  }
  cleanupAuthFolder();
  state.status = 'initializing';
  state.qrDataUrl = null;
  state.phone = null;
  state.error = null;
}

// API Routes
app.get('/status', (req, res) => {
  if (state.status === 'initializing' && !sock) {
    initializeWhatsApp().catch(() => {});
  }
  res.json({ success: true, data: { ...state } });
});

app.post('/disconnect', async (req, res) => {
  await disconnectWhatsApp();
  res.json({ success: true });
});

app.post('/send', async (req, res) => {
  if (!sock || state.status !== 'connected') {
    return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  }

  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'phone and message are required' });
    }

    const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ success: true, data: { sent: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to send message' });
  }
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[WhatsApp Service] Running on http://localhost:${PORT}`);
});
