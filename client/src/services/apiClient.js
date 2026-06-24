/**
 * apiClient.js — Cliente Axios configurado para la API del backend
 *
 * Crea una instancia de Axios que:
 *   1. Apunta a http://localhost:3001/api
 *   2. Agrega el token JWT del sessionStorage en cada petición
 *   3. Redirige al login si recibe un 401
 *
 * ⚠️ NO importa nada de authService para evitar dependencia circular
 *    (authService importa api de aquí)
 */

import axios from 'axios';
import supabase from './supabaseClient';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Interceptor: Agregar token a cada petición ───
api.interceptors.request.use(
  async (config) => {
    try {
      // Intentar obtener el token de la sesión activa de Supabase
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }
    } catch (err) {
      console.error('[apiClient] Error obteniendo sesión de Supabase:', err);
    }

    // Fallback: token local en sessionStorage
    const localToken = sessionStorage.getItem('auth_token');
    if (localToken) {
      config.headers.Authorization = `Bearer ${localToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor: Si el backend dice 401, redirigir al login ───
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('auth_token');
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[apiClient] Error cerrando sesión en Supabase:', err);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
