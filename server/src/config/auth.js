/**
 * Configuración centralizada de autenticación.
 *
 * Soporta dos modos:
 * 1. JWT propio (login tradicional con bcrypt + jsonwebtoken)
 * 2. Integración con Supabase Auth (tokens de Supabase)
 */
module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  /**
   * Los roles del sistema, ordenados por nivel de acceso
   * (admin tiene más permisos que asistente).
   */
  roles: {
    admin: 'admin',
    fotografo: 'fotografo',
    asistente: 'asistente',
    cliente: 'cliente',
  },

  /**
   * Jerarquía de roles para validación de permisos.
   * Un admin puede hacer todo lo que un fotografo, asistente, etc.
   */
  roleHierarchy: {
    admin: 100,
    fotografo: 50,
    asistente: 30,
    cliente: 10,
  },

  /**
   * Configuración de Supabase Auth.
   */
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
};
