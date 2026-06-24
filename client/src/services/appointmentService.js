/**
 * appointmentService.js — Servicio de Citas
 * Conecta CalendarPage al endpoint /api/appointments
 */
import api from './apiClient';

const appointmentService = {
  /**
   * Obtener citas con filtros.
   * @param {Object} filters - { date_from, date_to, status, client_id, page, limit }
   */
  async getAll(filters = {}) {
    const params = {};
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.status) params.status = filters.status;
    if (filters.client_id) params.client_id = filters.client_id;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    const response = await api.get('/appointments', { params });
    return response.data; // { data: [], pagination: {} }
  },

  /**
   * Obtener próximas citas (desde hoy, sin canceladas).
   */
  async getUpcoming() {
    const response = await api.get('/appointments/upcoming');
    return response.data; // array de citas
  },

  /**
   * Obtener una cita por ID.
   * @param {string} id
   */
  async getById(id) {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  /**
   * Crear una nueva cita.
   * @param {Object} data - { client_id, date, time, location, session_type, notes }
   */
  async create(data) {
    const response = await api.post('/appointments', data);
    return response.data;
  },

  /**
   * Actualizar una cita.
   * @param {string} id
   * @param {Object} data - Campos a actualizar
   */
  async update(id, data) {
    const response = await api.put(`/appointments/${id}`, data);
    return response.data;
  },

  /**
   * Buscar el siguiente espacio disponible en el calendario.
   * @param {string} [startDate] - Fecha base (YYYY-MM-DD), por defecto hoy
   * @returns {Promise<{date: string, time: string}>}
   */
  async getNextAvailable(startDate) {
    const params = {};
    if (startDate) params.start_date = startDate;
    const response = await api.get('/appointments/next-available', { params });
    return response.data;
  },

  /**
   * Eliminar una cita.
   * @param {string} id
   */
  async delete(id) {
    await api.delete(`/appointments/${id}`);
    return true;
  },
};

export default appointmentService;
