/**
 * settingsService.js — Servicio de Configuración
 * Conecta Settings.jsx al endpoint /api/settings
 */
import api from './apiClient';

const settingsService = {
  /**
   * Obtener todas las configuraciones del sistema.
   * @returns {Promise<Object>} { studio_name: "...", minTimeframe: 30, ... }
   */
  async get() {
    const response = await api.get('/settings');
    return response.data; // objeto plano clave → valor
  },

  /**
   * Actualizar configuraciones del sistema.
   * @param {Object} settings - { studio_name: "...", minTimeframe: 30 }
   * @returns {Promise<Object>} Settings actualizadas
   */
  async update(settings) {
    const response = await api.put('/settings', settings);
    return response.data;
  },
};

export default settingsService;
