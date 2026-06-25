/**
 * messageService.js — Servicio de Mensajes (WhatsApp)
 * Soporta texto, imágenes, audio, video y documentos.
 */
import api from './apiClient';

const messageService = {
  /** Obtener conversaciones agrupadas */
  async getConversations(filters = {}) {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.hideGroups) params.hide_groups = 'true';
    const response = await api.get('/messages', { params });
    return response.data;
  },

  /** Estadísticas */
  async getStats() {
    const response = await api.get('/messages/stats');
    return response.data;
  },

  /** Historial por cliente (con media) */
  async getByClient(clientId) {
    const response = await api.get(`/messages/client/${clientId}`);
    return response.data;
  },

  /** Historial por teléfono (con media) */
  async getByPhone(phone) {
    const encodedPhone = encodeURIComponent(phone);
    const response = await api.get(`/messages/phone/${encodedPhone}`);
    return response.data;
  },

  /** Enviar mensaje de texto */
  async send(data) {
    const response = await api.post('/messages', data);
    return response.data;
  },

  /** Enviar mensaje con archivo adjunto */
  async sendMedia(formData) {
    const response = await api.post('/messages/send-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Marcar teléfono como leído */
  async markAsRead(phone) {
    const response = await api.post('/messages/read', { phone });
    return response.data;
  },

  /** Vincular teléfono a un cliente existente */
  async linkClient(phone, clientId) {
    const response = await api.post('/messages/link-client', { phone, client_id: clientId });
    return response.data;
  },

  /** Eliminar una conversación completa */
  async deleteConversation(phone) {
    const response = await api.delete(`/messages/conversation/${encodeURIComponent(phone)}`);
    return response.data;
  },

  /** Crear cliente desde número de teléfono */
  async createClient(data) {
    const response = await api.post('/messages/create-client', data);
    return response.data;
  },

  /** Resolver un LID a número de teléfono real */
  async resolveLid(lid, phone) {
    const response = await api.post('/lid/resolve', { lid, phone });
    return response.data;
  },
};

export default messageService;
