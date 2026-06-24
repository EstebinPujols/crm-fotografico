/**
 * paymentService.js — Servicio de Pagos
 * Conecta páginas al endpoint /api/payments
 */
import api from './apiClient';

const paymentService = {
  /**
   * Obtener pagos con filtros.
   * @param {Object} filters - { client_id, project_id, status, page, limit }
   */
  async getAll(filters = {}) {
    const params = {};
    if (filters.client_id) params.client_id = filters.client_id;
    if (filters.project_id) params.project_id = filters.project_id;
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    const response = await api.get('/payments', { params });
    return response.data; // { data: [], pagination: {} }
  },

  /**
   * Resumen de pagos: total pendiente, total pagado.
   */
  async getSummary() {
    const response = await api.get('/payments/summary');
    return response.data; // { pending, paid, total_transactions }
  },

  /**
   * Obtener un pago por ID.
   * @param {string} id
   */
  async getById(id) {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo pago.
   * @param {Object} data - { client_id, project_id?, amount, status?, payment_method? }
   */
  async create(data) {
    const response = await api.post('/payments', data);
    return response.data;
  },

  /**
   * Actualizar un pago.
   * @param {string} id
   * @param {Object} data
   */
  async update(id, data) {
    const response = await api.put(`/payments/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un pago.
   * @param {string} id
   */
  async delete(id) {
    await api.delete(`/payments/${id}`);
    return true;
  },
};

export default paymentService;
