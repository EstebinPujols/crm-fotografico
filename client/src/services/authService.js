/**
 * ═══════════════════════════════════════════════
 *  authService.js — SERVICIO DE AUTENTICACIÓN
 * ═══════════════════════════════════════════════
 *
 *  📡 CONEXIÓN: Este servicio llama al BACKEND (POST /api/auth/login)
 *
 *  El flujo es:
 *    1. Enviamos email + password al backend
 *    2. El backend valida contra la base de datos con bcrypt
 *    3. El backend devuelve un token JWT + datos del usuario
 *    4. Guardamos el token en memoria (apiClient lo usa)
 *
 * ─────────────────────────────────────────────
 *  IMPLEMENTACIÓN COMPLETA — YA FUNCIONA
 * ─────────────────────────────────────────────
 */

import api from './apiClient';

/**
 * Inicia sesión llamando al backend.
 * Guarda el token en sessionStorage para que apiClient lo use.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: Object}>}
 */
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  const { token, user } = response.data;

  // Guardar token para que apiClient lo use en los interceptores
  sessionStorage.setItem('auth_token', token);

  return { token, user };
}

/**
 * Cierra sesión: limpia el token guardado.
 */
export async function logout() {
  sessionStorage.removeItem('auth_token');
}

/**
 * Obtiene el usuario actual desde el backend (valida el token).
 */
export async function getSession() {
  try {
    const response = await api.get('/auth/me');
    return { session: { user: response.data } };
  } catch {
    return { session: null };
  }
}

/**
 * Helper para obtener el token guardado (lo usa apiClient)
 */
export function getToken() {
  return sessionStorage.getItem('auth_token');
}
