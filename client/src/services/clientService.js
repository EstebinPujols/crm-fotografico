/**
 * clientService.js — Servicio de Clientes
 * Conecta ClientsPage al endpoint /api/clients
 */
import api from './apiClient';

const clientService = {
  /**
   * Obtener todos los clientes con filtros y paginación.
   * @param {Object} filters - { search, status, page, limit }
   */
  async getAll(filters = {}) {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    const response = await api.get('/clients', { params });
    return response.data; // { data: [], pagination: {} }
  },

  /**
   * Obtener un cliente por ID (con historial completo).
   * @param {string} id
   */
  async getById(id) {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo cliente.
   * @param {Object} data - { first_name, last_name, phone, email, address, notes }
   */
  async create(data) {
    const response = await api.post('/clients', data);
    return response.data;
  },

  /**
   * Actualizar un cliente.
   * @param {string} id
   * @param {Object} data - Campos a actualizar
   */
  async update(id, data) {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un cliente.
   * @param {string} id
   */
  async delete(id) {
    await api.delete(`/clients/${id}`);
    return true;
  },
};

export default clientService;
