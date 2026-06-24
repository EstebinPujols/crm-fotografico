const { Router } = require('express');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { clientRules, clientUpdateRules } = require('../validators');

const router = Router();

router.use(authenticate);

/**
 * GET /api/clients
 * Lista todos los clientes, con búsqueda y paginación.
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // Construir query base
    let query = db
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      // Supabase no soporta ILIKE directamente; usamos or filter
      query = query.or(
        `first_name.ilike.%${search}%,` +
        `last_name.ilike.%${search}%,` +
        `email.ilike.%${search}%,` +
        `phone.ilike.%${search}%`
      );
    }

    const { data: clients, error, count } = await query;

    if (error) throw error;

    // Obtener project_count y total_spent para cada cliente
    const enriched = await Promise.all(
      (clients || []).map(async (client) => {
        const { count: projectCount } = await db
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id);

        const { data: payments } = await db
          .from('payments')
          .select('amount')
          .eq('client_id', client.id);

        const totalSpent = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        return {
          ...client,
          project_count: projectCount || 0,
          total_spent: totalSpent,
        };
      })
    );

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
 * GET /api/clients/:id
 * Obtiene un cliente por ID con su historial completo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data: clients, error } = await db
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .limit(1);

    const client = clients?.[0];
    if (!client || error) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Cargar relaciones en paralelo
    const [
      { data: appointments },
      { data: projects },
      { data: payments },
      { data: messages },
    ] = await Promise.all([
      db.from('appointments').select('*').eq('client_id', client.id).order('date', { ascending: false }),
      db.from('projects').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      db.from('payments').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      db.from('whatsapp_messages').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).limit(50),
    ]);

    res.json({
      ...client,
      appointments: appointments || [],
      projects: projects || [],
      payments: payments || [],
      messages: messages || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/clients
 * Crea un nuevo cliente.
 */
router.post('/', requireRole('asistente'), clientRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, phone, email, address, social_media, notes } = req.body;

    const { data: clients, error } = await db
      .from('clients')
      .insert({
        first_name,
        last_name,
        phone,
        email,
        address,
        social_media: social_media || null,
        notes,
      })
      .select();

    if (error) throw error;
    res.status(201).json(clients?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/clients/:id
 * Actualiza un cliente existente.
 */
router.put('/:id', requireRole('asistente'), clientUpdateRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que existe
    const { data: existing } = await db
      .from('clients')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updates = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    const { data: clients, error } = await db
      .from('clients')
      .update(updates)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(clients?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/clients/:id
 * Elimina un cliente (y datos relacionados por CASCADE).
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('clients')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const { error } = await db
      .from('clients')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
