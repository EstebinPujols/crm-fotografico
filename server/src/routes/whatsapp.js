/**
 * ═══════════════════════════════════════════════
 *  whatsapp.js — Rutas de WhatsApp
 * ═══════════════════════════════════════════════
 *
 *  Endpoints para controlar la conexión WhatsApp
 *  desde el frontend.
 *
 *  GET    /api/whatsapp/status   — Estado de la conexión
 *  GET    /api/whatsapp/qr       — QR en base64 (solo si status='qr')
 *  POST   /api/whatsapp/send     — Enviar mensaje
 *  POST   /api/whatsapp/start    — Forzar reinicio de conexión
 *  POST   /api/whatsapp/logout   — Cerrar sesión
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const whatsapp = require('../services/whatsapp');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/whatsapp/status
 * Devuelve el estado actual de la conexión WhatsApp.
 */
router.get('/status', (req, res) => {
  res.json({
    status: whatsapp.state.status,
    phone: whatsapp.state.phone,
    lastError: whatsapp.state.lastError,
    hasQr: !!whatsapp.state.qrData,
  });
});

/**
 * GET /api/whatsapp/qr
 * Devuelve el QR en base64 para escanear.
 * Solo disponible cuando status === 'qr'.
 */
router.get('/qr', (req, res) => {
  if (whatsapp.state.status !== 'qr' || !whatsapp.state.qrData) {
    return res.status(404).json({ error: 'No hay QR disponible. Estado actual: ' + whatsapp.state.status });
  }
  res.json({ qr: whatsapp.state.qrData });
});

/**
 * POST /api/whatsapp/send
 * Enviar un mensaje de texto a un número.
 * Body: { to: string, message: string }
 */
router.post('/send', async (req, res, next) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Faltan campos: to (número) y message (texto)' });
    }
    const result = await whatsapp.sendMessage(to, message);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/whatsapp/start
 * Forzar reinicio de la conexión WhatsApp.
 */
router.post('/start', async (req, res, next) => {
  try {
    if (whatsapp.state.status === 'connected') {
      return res.json({ message: 'WhatsApp ya está conectado' });
    }
    // Forzar reinicio
    if (whatsapp.state._sock) {
      try { whatsapp.state._sock.ws?.close(); } catch (_) {}
      whatsapp.state._sock = null;
    }
    whatsapp.start();
    res.json({ message: 'Iniciando conexión WhatsApp…' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/whatsapp/logout
 * Cerrar sesión de WhatsApp y limpiar credenciales.
 */
router.post('/logout', async (req, res, next) => {
  try {
    await whatsapp.logout();
    res.json({ message: 'Sesión de WhatsApp cerrada' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
