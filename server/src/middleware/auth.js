const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const { supabaseAdmin } = require('../config/supabase');
const db = require('../config/database');

/**
 * Middleware: verifica que el token JWT sea válido.
 *
 Soporta dos modos:
 * 1. Token propio del backend (bcrypt + JWT local)
 * 2. Token de Supabase Auth (JWT firmado por Supabase)
 *
 * Adjunta `req.user` con los datos del usuario autenticado.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: 'Se requiere autenticación' });
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  const token = parts[1];

  try {
    // Intentar modo 1: token propio del backend
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    return next();
  } catch (err) {
    // Si falló con TokenExpiredError, no intentar Supabase
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    // Si no es nuestro token, probar con Supabase
  }

  try {
    // Modo 2: token de Supabase Auth
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Buscar el usuario en nuestra tabla por supabase_uid
    let user = await db('users').where({ supabase_uid: supabaseUser.id }).first();

    // Si no existe, crear un registro automáticamente (primer login)
    if (!user) {
      const metadata = supabaseUser.user_metadata || {};
      const [newUser] = await db('users')
        .insert({
          supabase_uid: supabaseUser.id,
          name: metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0] || 'Usuario',
          email: supabaseUser.email || '',
          role: 'asistente', // Rol por defecto
        })
        .returning(['id', 'name', 'email', 'role', 'supabase_uid']);

      user = newUser;
    }

    req.user = {
      id: user.id,
      supabaseUid: user.supabase_uid,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (err) {
    console.error('[Auth] Error verificando token Supabase:', err.message);
    return res.status(401).json({ error: 'Error de autenticación' });
  }
}

module.exports = { authenticate };
