/**
 * Middleware centralizado de manejo de errores.
 * Atrapa errores inesperados y responde con formato consistente.
 */
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Errores conocidos de Knex / base de datos
  if (err.code && err.code.startsWith('42')) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      detail: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }

  // Errores de validación personalizados
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Error genérico
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV !== 'production'
      ? err.message
      : 'Error interno del servidor',
  });
}

/**
 * Helper para crear errores con código HTTP.
 */
function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, createError };
