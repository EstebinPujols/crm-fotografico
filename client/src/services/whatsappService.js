/**
 * ═══════════════════════════════════════════════
 *  whatsappService.js — Servicio WhatsApp
 * ═══════════════════════════════════════════════
 *
 *  Conecta la UI de WhatsApp con los endpoints
 *  del backend.
 */

import api from './apiClient';

const whatsappService = {
  /** Obtener estado de la conexión */
  async getStatus() {
    const res = await api.get('/whatsapp/status');
    return res.data;
  },

  /** Obtener QR en base64 */
  async getQR() {
    const res = await api.get('/whatsapp/qr');
    return res.data.qr;
  },

  /** Iniciar/reiniciar conexión */
  async start() {
    const res = await api.post('/whatsapp/start');
    return res.data;
  },

  /** Enviar mensaje */
  async send(to, message) {
    const res = await api.post('/whatsapp/send', { to, message });
    return res.data;
  },

  /** Cerrar sesión */
  async logout() {
    const res = await api.post('/whatsapp/logout');
    return res.data;
  },
};

export default whatsappService;
