/**
 * ═══════════════════════════════════════════════
 *  galleryService.js — SERVICIO DE GALERÍAS
 * ═══════════════════════════════════════════════
 *
 *  🎯 TU TAREA: Reemplazar localStorage por llamadas a la API
 *
 *  ANTES: Este archivo guardaba galerías en localStorage con datos mock
 *  AHORA: Debe conectar al backend real usando apiClient
 *
 *  📚 LO QUE NECESITAS SABER:
 *
 *  - `api` es el cliente de Axios que configuraste en apiClient.js
 *  - Cada función debe hacer una petición HTTP al backend
 *  - El backend responde con { data: [...], pagination: {...} } en listas
 *    y con el objeto directamente en getById
 *
 *  📡 ENDPOINTS DISPONIBLES:
 *
 *    GET    /api/galleries?status=&search=&page=&limit=
 *    GET    /api/galleries/:id
 *    POST   /api/galleries          body: { client_id, title, status, project_id }
 *    PUT    /api/galleries/:id       body: { title, status }
 *    DELETE /api/galleries/:id
 *
 *  🔍 PISTAS para cada función:
 *
 *    getAll(filters):
 *      const params = {}
 *      if (filters.status) params.status = filters.status
 *      if (filters.search) params.search = filters.search
 *      const response = await api.get('/galleries', { params })
 *      return response.data  // { data: [...], pagination: {...} }
 *
 *    getById(id):
 *      const response = await api.get(`/galleries/${id}`)
 *      return response.data  // el objeto galería
 *
 *    create(data):
 *      const response = await api.post('/galleries', data)
 *      return response.data
 *
 *    update(id, data):
 *      const response = await api.put(`/galleries/${id}`, data)
 *      return response.data
 *
 *    delete(id):
 *      await api.delete(`/galleries/${id}`)
 *      return true
 *
 *  ⚠️ ERRORES COMUNES DE NOVATO:
 *  - Olvidar el await — las peticiones HTTP son asíncronas
 *  - Confundir response.data con el objeto que necesitas
 *    (Axios envuelve la respuesta, la data real está en response.data)
 *  - No mandar los parámetros correctos al GET (usa { params })
 *  - Olvidar las backticks `` en las URLs con variables
 *
 * ─────────────────────────────────────────────
 *  ¡Manos a la obra! Escribe tu código abajo 👇
 * ─────────────────────────────────────────────
 */

import api from './apiClient';

const galleryService = {
  /**
   * Obtener todas las galerías, opcionalmente filtradas.
   *
   * ANTES: localStorage con datos mock
   * AHORA: GET /api/galleries con filtros
   *
   * @param {Object} filters - { status?: string, search?: string }
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getAll(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    const response = await api.get('/galleries', { params });
    return response.data; // { data: [], pagination: {} }
  },

  /**
   * Obtener una galería por ID.
   *
   * ANTES: buscar en array de localStorage
   * AHORA: GET /api/galleries/:id
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const response = await api.get(`/galleries/${id}`);
    return response.data;
  },

  /**
   * Crear una nueva galería.
   *
   * ANTES: push a array + guardar en localStorage
   * AHORA: POST /api/galleries con los datos
   *
   * @param {Object} data - { client_id, title, status?, project_id? }
   * @returns {Promise<Object>}
   */
  async create(data) {
    const response = await api.post('/galleries', data);
    return response.data;
  },

  /**
   * Actualizar una galería existente.
   *
   * ANTES: modificar en array + guardar en localStorage
   * AHORA: PUT /api/galleries/:id
   *
   * @param {string} id
   * @param {Object} data - Campos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const response = await api.put(`/galleries/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar una galería.
   *
   * ANTES: filtrar array + guardar en localStorage
   * AHORA: DELETE /api/galleries/:id
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await api.delete(`/galleries/${id}`);
    return true;
  },
};

export default galleryService;
