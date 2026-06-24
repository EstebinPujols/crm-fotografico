const { Router } = require('express');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { projectRules } = require('../validators');

const router = Router();

router.use(authenticate);

/**
 * GET /api/projects
 * Lista proyectos con filtros.
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, client_id, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = db
      .from('projects')
      .select('*, clients(first_name, last_name)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);

    const { data: projects, error } = await query;
    if (error) throw error;

    // Contar total
    let countQuery = db
      .from('projects')
      .select('*', { count: 'exact', head: true });
    if (status) countQuery = countQuery.eq('status', status);
    if (client_id) countQuery = countQuery.eq('client_id', client_id);
    const { count } = await countQuery;

    const enriched = (projects || []).map((p) => ({
      ...p,
      client_name: p.clients
        ? `${p.clients.first_name || ''} ${p.clients.last_name || ''}`.trim()
        : null,
      clients: undefined,
    }));

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
 * GET /api/projects/:id
 * Obtiene un proyecto con sus pagos y galerías.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data: projects, error } = await db
      .from('projects')
      .select('*, clients(first_name, last_name)')
      .eq('id', req.params.id)
      .limit(1);

    const project = projects?.[0];
    if (!project || error) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const [{ data: payments }, { data: galleries }] = await Promise.all([
      db.from('payments').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
      db.from('galleries').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
    ]);

    res.json({
      ...project,
      client_name: project.clients
        ? `${project.clients.first_name || ''} ${project.clients.last_name || ''}`.trim()
        : null,
      clients: undefined,
      payments: payments || [],
      galleries: galleries || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects
 * Crea un nuevo proyecto.
 */
router.post('/', requireRole('fotografo'), projectRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { client_id, appointment_id, name, delivery_date } = req.body;

    const { data: projects, error } = await db
      .from('projects')
      .insert({
        client_id,
        appointment_id: appointment_id || null,
        name,
        status: 'pendiente',
        delivery_date,
      })
      .select();

    if (error) throw error;
    res.status(201).json(projects?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/projects/:id
 * Actualiza un proyecto (especialmente el estado).
 */
router.put('/:id', requireRole('fotografo'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('projects')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const allowedFields = ['name', 'status', 'delivery_date'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data: projects, error } = await db
      .from('projects')
      .update(updates)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(projects?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/projects/:id
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('projects')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const { error } = await db
      .from('projects')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Proyecto eliminado exitosamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
