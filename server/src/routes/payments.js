const { Router } = require('express');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { paymentRules } = require('../validators');

const router = Router();

router.use(authenticate);

/**
 * GET /api/payments
 * Lista pagos con filtros.
 */
router.get('/', async (req, res, next) => {
  try {
    const { client_id, project_id, status, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = db
      .from('payments')
      .select('*, clients(first_name, last_name)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (client_id) query = query.eq('client_id', client_id);
    if (project_id) query = query.eq('project_id', project_id);
    if (status) query = query.eq('status', status);

    const { data: payments, error } = await query;
    if (error) throw error;

    let countQuery = db
      .from('payments')
      .select('*', { count: 'exact', head: true });
    if (client_id) countQuery = countQuery.eq('client_id', client_id);
    if (project_id) countQuery = countQuery.eq('project_id', project_id);
    if (status) countQuery = countQuery.eq('status', status);
    const { count } = await countQuery;

    const enriched = (payments || []).map((p) => ({
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
 * GET /api/payments/summary
 * Resumen de pagos: total pendiente, total pagado.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { data: payments } = await db
      .from('payments')
      .select('amount, status');

    const amounts = (payments || []).map((p) => ({
      amount: parseFloat(p.amount || 0),
      status: p.status,
    }));

    const summary = {
      pending: amounts
        .filter((p) => p.status === 'pendiente' || p.status === 'parcial')
        .reduce((s, p) => s + p.amount, 0),
      paid: amounts
        .filter((p) => p.status === 'pagado')
        .reduce((s, p) => s + p.amount, 0),
      total_transactions: amounts.length,
    };

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payments/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data: payments, error } = await db
      .from('payments')
      .select('*, clients(first_name, last_name)')
      .eq('id', req.params.id)
      .limit(1);

    const payment = payments?.[0];
    if (!payment || error) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    res.json({
      ...payment,
      client_name: payment.clients
        ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim()
        : null,
      clients: undefined,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments
 */
router.post('/', requireRole('asistente'), paymentRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { client_id, project_id, amount, status, payment_method } = req.body;

    const { data: payments, error } = await db
      .from('payments')
      .insert({
        client_id,
        project_id: project_id || null,
        amount,
        status: status || 'pendiente',
        payment_method,
      })
      .select();

    if (error) throw error;
    res.status(201).json(payments?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/payments/:id
 */
router.put('/:id', requireRole('asistente'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('payments')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const allowedFields = ['amount', 'status', 'payment_method'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data: payments, error } = await db
      .from('payments')
      .update(updates)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(payments?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/payments/:id
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('payments')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const { error } = await db
      .from('payments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Pago eliminado exitosamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
