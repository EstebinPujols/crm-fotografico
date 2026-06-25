const { Router } = require('express');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { galleryRules } = require('../validators');
const crypto = require('crypto');

const router = Router();

/**
 * GET /api/galleries/shared/:token
 * Ruta pública — acceder a una galería compartida sin autenticación.
 */
router.get('/shared/:token', async (req, res, next) => {
  try {
    const { data: galleries, error } = await db
      .from('galleries')
      .select('id, title, created_at, client_id, clients(first_name, last_name)')
      .eq('share_token', req.params.token)
      .eq('status', 'active')
      .limit(1);

    const gallery = galleries?.[0];
    if (!gallery || error) {
      return res.status(404).json({ error: 'Galería no encontrada o no disponible' });
    }

    const { data: photos } = await db
      .from('gallery_photos')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('created_at', { ascending: true });

    const { count: photoCount } = await db
      .from('gallery_photos')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', gallery.id);

    res.json({
      ...gallery,
      client_name: gallery.clients
        ? `${gallery.clients.first_name || ''} ${gallery.clients.last_name || ''}`.trim()
        : null,
      clients: undefined,
      photo_count: photoCount || 0,
      photos: photos || [],
    });
  } catch (err) {
    next(err);
  }
});

// El resto de rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/galleries
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, client_id, search, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = db
      .from('galleries')
      .select('*, clients(first_name, last_name)')
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,` +
        `clients.first_name.ilike.%${search}%,` +
        `clients.last_name.ilike.%${search}%`
      );
    }

    const { data: galleries, error } = await query;
    if (error) throw error;

    // Contar total
    let countQuery = db
      .from('galleries')
      .select('*', { count: 'exact', head: true });
    if (status && status !== 'all') countQuery = countQuery.eq('status', status);
    if (client_id) countQuery = countQuery.eq('client_id', client_id);
    const { count } = await countQuery;

    // Photo counts
    const enriched = await Promise.all(
      (galleries || []).map(async (g) => {
        const { count: pc } = await db
          .from('gallery_photos')
          .select('*', { count: 'exact', head: true })
          .eq('gallery_id', g.id);

        return {
          ...g,
          client_name: g.clients
            ? `${g.clients.first_name || ''} ${g.clients.last_name || ''}`.trim()
            : null,
          clients: undefined,
          photo_count: pc || 0,
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
 * GET /api/galleries/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data: galleries, error } = await db
      .from('galleries')
      .select('*, clients(first_name, last_name)')
      .eq('id', req.params.id)
      .limit(1);

    const gallery = galleries?.[0];
    if (!gallery || error) {
      return res.status(404).json({ error: 'Galería no encontrada' });
    }

    const { data: photos } = await db
      .from('gallery_photos')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('created_at', { ascending: true });

    res.json({
      ...gallery,
      client_name: gallery.clients
        ? `${gallery.clients.first_name || ''} ${gallery.clients.last_name || ''}`.trim()
        : null,
      clients: undefined,
      photos: photos || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/galleries
 */
router.post('/', requireRole('fotografo'), galleryRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { client_id, project_id, title, status, external_url } = req.body;

    const { data: galleries, error } = await db
      .from('galleries')
      .insert({
        client_id,
        project_id: project_id || null,
        title,
        external_url: external_url || null,
        status: status || 'borrador',
        share_token: crypto.randomUUID(),
      })
      .select();

    if (error) throw error;
    res.status(201).json(galleries?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/galleries/:id
 */
router.put('/:id', requireRole('fotografo'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('galleries')
      .select('*')
      .eq('id', req.params.id)
      .limit(1);

    const gallery = existing?.[0];
    if (!gallery) {
      return res.status(404).json({ error: 'Galería no encontrada' });
    }

    const allowedFields = ['title', 'status', 'external_url'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    // Si se activa la galería y no tiene share_token, generar uno
    if (updates.status === 'active' && !gallery.share_token) {
      updates.share_token = crypto.randomUUID();
    }

    const { data: galleries, error } = await db
      .from('galleries')
      .update(updates)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(galleries?.[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/galleries/:id
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('galleries')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Galería no encontrada' });
    }

    // Eliminar fotos relacionadas (CASCADE debería manejarlo, pero por seguridad)
    await db.from('gallery_photos').delete().eq('gallery_id', req.params.id);
    await db.from('galleries').delete().eq('id', req.params.id);

    res.json({ message: 'Galería eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/galleries/:id/photos
 * Subir fotos a una galería.
 */
router.post('/:id/photos', requireRole('fotografo'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('galleries')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Galería no encontrada' });
    }

    const { photos } = req.body;
    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de fotos' });
    }

    const photoRecords = photos.map((p) => ({
      gallery_id: req.params.id,
      url: p.url,
      filename: p.filename || 'untitled',
      size_bytes: p.size_bytes || 0,
    }));

    const { data: inserted, error } = await db
      .from('gallery_photos')
      .insert(photoRecords)
      .select();

    if (error) throw error;

    // Actualizar updated_at de la galería
    await db
      .from('galleries')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.status(201).json(inserted || []);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/galleries/:id/photos/:photoId
 */
router.delete('/:id/photos/:photoId', requireRole('fotografo'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('gallery_photos')
      .select('id')
      .eq('id', req.params.photoId)
      .eq('gallery_id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    await db.from('gallery_photos').delete().eq('id', req.params.photoId);

    await db
      .from('galleries')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ message: 'Foto eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
