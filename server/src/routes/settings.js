const { Router } = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/settings
 * Devuelve todas las configuraciones del sistema.
 */
router.get('/', async (req, res, next) => {
  try {
    const { data: rows, error } = await db
      .from('settings')
      .select('key, value');

    if (error) throw error;

    const settings = {};
    for (const row of rows || []) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings
 * Actualiza configuraciones del sistema.
 * Espera un objeto con pares key: value.
 */
router.put('/', async (req, res, next) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos una configuración' });
    }

    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // UPSERT usando onConflict (key tiene UNIQUE constraint)
      const { error } = await db
        .from('settings')
        .upsert({ key, value: stringValue }, { onConflict: 'key' });

      if (error) throw error;
    }

    // Devolver settings actualizadas
    const { data: rows, error } = await db
      .from('settings')
      .select('key, value');

    if (error) throw error;

    const settings = {};
    for (const row of rows || []) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
