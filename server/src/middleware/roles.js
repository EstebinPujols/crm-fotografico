const { roleHierarchy, roles } = require('../config/auth');

/**
 * Middleware: verifica que el rol del usuario tenga al menos
 * el nivel requerido.
 *
 * @param {string} minRole - El rol mínimo requerido ('admin', 'fotografo', 'asistente')
 * @returns {Function} Middleware de Express
 */
function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Se requiere autenticación' });
    }

    const userLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción',
        required: minRole,
        yourRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware: permite solo roles específicos.
 * @param {string[]} allowedRoles - Array de roles permitidos
 */
function allowRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Se requiere autenticación' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción',
        allowedRoles,
        yourRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware opcional: si hay token, lo decodifica y adjunta req.user.
 * Si no hay token, simplemente continúa (para rutas públicas).
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return next();
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }

  const token = parts[1];

  try {
    const jwt = require('jsonwebtoken');
    const { jwtSecret } = require('../config/auth');
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
  } catch (err) {
    // Token inválido, pero es opcional — seguimos
  }

  next();
}

module.exports = { requireRole, allowRoles, optionalAuth };
