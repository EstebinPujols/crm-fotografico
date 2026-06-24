const { Router } = require('express');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { appointmentRules } = require('../validators');

const router = Router();

router.use(authenticate);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lee el intervalo mínimo entre citas desde la tabla de configuraciones.
 * @returns {Promise<number>} Minutos — default 30
 */
async function getMinTimeframe() {
  try {
    const { data } = await db.from('settings').select('value').eq('key', 'minTimeframe').limit(1);
    if (data?.length) {
      const val = parseInt(data[0].value, 10);
      return val >= 1 ? val : 30;
    }
  } catch (e) {
    // fallback silencioso
  }
  return 30;
}

/**
 * Valida que una cita nueva/editada no esté demasiado cerca de otra existente.
 *
 * @param {string} date - Fecha YYYY-MM-DD
 * @param {string} time - Hora HH:MM
 * @param {string|null} excludeId - ID de cita a excluir (para ediciones)
 * @returns {Promise<{conflict: boolean, message?: string}>}
 */
async function checkTimeframeConflict(date, time, excludeId = null) {
  const minFrame = await getMinTimeframe();

  // Traer citas del mismo día (no canceladas)
  let query = db
    .from('appointments')
    .select('id, time')
    .eq('date', date)
    .neq('status', 'cancelada');

  const { data: existing } = await query;
  if (!existing || existing.length === 0) return { conflict: false };

  // Convertir hora a minutos desde medianoche
  const newMinutes = timeToMinutes(time);

  for (const appt of existing) {
    if (excludeId && appt.id === excludeId) continue;
    if (!appt.time) continue;

    const existingMinutes = timeToMinutes(appt.time);
    const diff = Math.abs(newMinutes - existingMinutes);

    if (diff < minFrame) {
      return {
        conflict: true,
        message: `La cita está demasiado cerca de otra existente (${appt.time}). El intervalo mínimo es de ${minFrame} minutos.`,
      };
    }
  }

  return { conflict: false };
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Valida que una fecha+hora no esté en el pasado.
 * @param {string} date - YYYY-MM-DD
 * @param {string} time - HH:MM
 * @returns {{valid: boolean, message?: string}}
 */
function checkIsInPast(date, time) {
  const today = new Date().toISOString().split('T')[0];

  // Fecha pasada
  if (date < today) {
    return { valid: false, message: 'No puedes agendar citas en el pasado' };
  }

  // Si es hoy, validar hora
  if (date === today && time) {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const apptTotalMin = h * 60 + m;
    const nowTotalMin = now.getHours() * 60 + now.getMinutes();
    if (apptTotalMin <= nowTotalMin) {
      return { valid: false, message: 'La hora de la cita ya pasó' };
    }
  }

  return { valid: true };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * GET /api/appointments
 * Lista citas con filtros por fecha, cliente y estado.
 */
router.get('/', async (req, res, next) => {
  try {
    const { date_from, date_to, status, client_id, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = db
      .from('appointments')
      .select('*, clients(first_name, last_name, phone)')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .range(from, to);

    if (date_from) query = query.gte('date', date_from);
    if (date_to) query = query.lte('date', date_to);
    if (status) query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);

    const { data: appointments, error } = await query;
    if (error) throw error;

    const enriched = (appointments || []).map((a) => ({
      ...a,
      client_name: a.clients
        ? `${a.clients.first_name || ''} ${a.clients.last_name || ''}`.trim()
        : null,
      client_phone: a.clients?.phone || null,
      clients: undefined,
    }));

    let countQuery = db
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    if (date_from) countQuery = countQuery.gte('date', date_from);
    if (date_to) countQuery = countQuery.lte('date', date_to);
    if (status) countQuery = countQuery.eq('status', status);
    if (client_id) countQuery = countQuery.eq('client_id', client_id);

    const { count } = await countQuery;

    res.json({
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/next-available
 * Busca el siguiente espacio disponible a partir de una fecha base.
 *
 * ⚠️ DEBE ir antes de /:id para que Express no atrape "next-available" como param.
 */
router.get('/next-available', async (req, res, next) => {
  try {
    const baseDate = req.query.start_date || new Date().toISOString().split('T')[0];
    const minFrame = await getMinTimeframe();
    const stepMinutes = Math.max(30, minFrame);

    const START_HOUR = 9;   // 09:00
    const END_HOUR = 18;    // 18:00
    const MAX_DAYS = 30;

    let cursor = new Date(baseDate + 'T00:00:00');

    for (let day = 0; day < MAX_DAYS; day++) {
      const dateStr = cursor.toISOString().split('T')[0];

      // Obtener citas existentes este día (no canceladas)
      const { data: dayAppts } = await db
        .from('appointments')
        .select('time')
        .eq('date', dateStr)
        .neq('status', 'cancelada')
        .order('time', { ascending: true });

      // Construir set de minutos ocupados (con margen de stepMinutes)
      const busy = new Set();
      if (dayAppts) {
        for (const appt of dayAppts) {
          if (!appt.time) continue;
          const startMins = timeToMinutes(appt.time);
          for (let m = startMins - stepMinutes + 1; m < startMins + stepMinutes; m++) {
            busy.add(m);
          }
        }
      }

      // Buscar primer hueco libre en horario laboral
      for (let mins = START_HOUR * 60; mins < END_HOUR * 60; mins += stepMinutes) {
        if (!busy.has(mins)) {
          return res.json({ date: dateStr, time: minutesToTime(mins) });
        }
      }

      // Pasar al siguiente día
      cursor.setDate(cursor.getDate() + 1);
    }

    // No se encontró espacio en 30 días
    res.status(404).json({ error: 'No se encontró espacio disponible en los próximos 30 días' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/upcoming
 * Próximas citas (desde hoy en adelante).
 */
router.get('/upcoming', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: appointments, error } = await db
      .from('appointments')
      .select('*, clients(first_name, last_name, phone)')
      .gte('date', today)
      .neq('status', 'cancelada')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(20);

    if (error) throw error;

    const enriched = (appointments || []).map((a) => ({
      ...a,
      client_name: a.clients
        ? `${a.clients.first_name || ''} ${a.clients.last_name || ''}`.trim()
        : null,
      client_phone: a.clients?.phone || null,
      clients: undefined,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/:id
 * Obtiene una cita por ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data: appointments, error } = await db
      .from('appointments')
      .select('*, clients(first_name, last_name, phone, email)')
      .eq('id', req.params.id)
      .limit(1);

    const appointment = appointments?.[0];
    if (!appointment || error) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    res.json({
      ...appointment,
      client_name: appointment.clients
        ? `${appointment.clients.first_name || ''} ${appointment.clients.last_name || ''}`.trim()
        : null,
      client_phone: appointment.clients?.phone || null,
      client_email: appointment.clients?.email || null,
      clients: undefined,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/appointments
 * Crea una nueva cita con validación de intervalo mínimo.
 */
router.post('/', requireRole('asistente'), appointmentRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { client_id, date, time, location, session_type, notes } = req.body;

    // Validar que la fecha/hora no esté en el pasado
    const past = checkIsInPast(date, time);
    if (!past.valid) {
      return res.status(400).json({ error: past.message });
    }

    // Validar colisión de intervalo mínimo
    const conflict = await checkTimeframeConflict(date, time);
    if (conflict.conflict) {
      return res.status(400).json({ error: conflict.message });
    }

    const { data: appointments, error } = await db
      .from('appointments')
      .insert({
        client_id,
        date,
        time,
        location,
        session_type,
        notes,
        status: 'pendiente',
      })
      .select();

    if (error) throw error;
    res.status(201).json(appointments?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/appointments/:id
 * Actualiza una cita con validación de intervalo mínimo.
 */
router.put('/:id', requireRole('asistente'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('appointments')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const allowedFields = ['date', 'time', 'location', 'session_type', 'status', 'notes'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    // Validar que la fecha/hora no esté en el pasado (si cambiaron)
    if (updates.date || updates.time) {
      const dateStr = updates.date || req.body.date;
      const timeStr = updates.time || req.body.time;
      const past = checkIsInPast(dateStr, timeStr);
      if (!past.valid) {
        return res.status(400).json({ error: past.message });
      }
    }

    // Validar colisión si cambió fecha u hora
    if (updates.date && updates.time) {
      const conflict = await checkTimeframeConflict(updates.date, updates.time, req.params.id);
      if (conflict.conflict) {
        return res.status(400).json({ error: conflict.message });
      }
    }

    const { data: appointments, error } = await db
      .from('appointments')
      .update(updates)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(appointments?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/appointments/:id
 * Elimina una cita.
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('appointments')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const { error } = await db
      .from('appointments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Cita eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
