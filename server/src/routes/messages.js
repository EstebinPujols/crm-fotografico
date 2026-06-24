const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const whatsapp = require('../services/whatsapp');
const readState = require('../services/messageReadState');
const mediaIndex = require('../services/mediaIndex');

const router = Router();

router.use(authenticate);

// ─── Configuración de multer ──────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '../../uploads/whatsapp/attachments');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// ─── GET /api/messages — lista conversaciones ─────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;

    let query = db
      .from('whatsapp_messages')
      .select('*, clients(id, first_name, last_name, phone)')
      .order('created_at', { ascending: false });

    const { data: messages, error } = await query;
    if (error) throw error;

    // Cargar índice de media para todos los mensajes
    const mediaIds = (messages || []).map(m => m.id);
    const mediaMap = mediaIndex.getMany(mediaIds);

    // Agrupar por teléfono
    const convMap = new Map();
    for (const msg of messages || []) {
      const phone = msg.phone;
      if (!convMap.has(phone)) {
        convMap.set(phone, {
          phone,
          client_id: msg.client_id,
          client_name: msg.clients
            ? `${msg.clients.first_name || ''} ${msg.clients.last_name || ''}`.trim()
            : null,
          last_message: msg.message,
          last_direction: msg.direction,
          last_at: msg.created_at,
          message_count: 1,
          has_media: !!mediaMap[msg.id],
          media_type: mediaMap[msg.id]?.type || null,
        });
      } else {
        const conv = convMap.get(phone);
        conv.message_count += 1;
        // La última fecha ya es la primera por el ORDER BY DESC
      }
    }

    let conversations = Array.from(convMap.values());

    // No leídos
    for (const conv of conversations) {
      const phoneMsgs = (messages || []).filter(m => m.phone === conv.phone);
      conv.unread_count = readState.getUnreadCount(phoneMsgs, conv.phone);
    }

    // Filtro búsqueda
    if (search) {
      const q = search.toLowerCase();
      conversations = conversations.filter(
        (c) =>
          c.phone.includes(search) ||
          (c.client_name && c.client_name.toLowerCase().includes(q))
      );
    }

    // Ordenar: no leídos primero, luego fecha descendente
    conversations.sort((a, b) => {
      if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count;
      return new Date(b.last_at) - new Date(a.last_at);
    });

    const total = conversations.length;
    const paginated = conversations.slice(from, from + limitNum);

    res.json({
      data: paginated,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/messages/stats ──────────────────────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const { data: messages, error } = await db
      .from('whatsapp_messages')
      .select('direction, phone, created_at');

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const todayMessages = (messages || []).filter(
      (m) => m.created_at && m.created_at.startsWith(today)
    );

    const unread = readState.getTotalUnread(messages || []);

    res.json({
      total: messages?.length || 0,
      entrantes: (messages || []).filter((m) => m.direction === 'entrante').length,
      salientes: (messages || []).filter((m) => m.direction === 'saliente').length,
      today: todayMessages.length,
      unread,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/messages/client/:clientId ──────────────────────────────────────

router.get('/client/:clientId', async (req, res, next) => {
  try {
    const { data: messages, error } = await db
      .from('whatsapp_messages')
      .select('*')
      .eq('client_id', req.params.clientId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Adjuntar media info
    const msgList = messages || [];
    const mediaMap = mediaIndex.getMany(msgList.map(m => m.id));
    const enriched = msgList.map(m => ({
      ...m,
      media: mediaMap[m.id] || null,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/messages/phone/:phone ──────────────────────────────────────────

router.get('/phone/:phone', async (req, res, next) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { data: messages, error } = await db
      .from('whatsapp_messages')
      .select('*, clients(id, first_name, last_name)')
      .eq('phone', phone)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Adjuntar media info
    const msgList = messages || [];
    const mediaMap = mediaIndex.getMany(msgList.map(m => m.id));
    const enriched = msgList.map(m => ({
      ...m,
      media: mediaMap[m.id] || null,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/messages — Enviar/registrar mensaje (texto) ───────────────────

router.post('/', requireRole('asistente'), async (req, res, next) => {
  try {
    const { client_id, phone, direction, message } = req.body;

    if (!phone || !direction || !message) {
      return res.status(400).json({ error: 'phone, direction y message son requeridos' });
    }
    if (!['entrante', 'saliente'].includes(direction)) {
      return res.status(400).json({ error: 'direction debe ser entrante o saliente' });
    }

    // ★ FIX: Si el phone es un LID numérico (formato viejo), intentar resolverlo
    // buscando el JID original en la misma conversación
    let sendTo = phone;
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length > 12 && !phone.includes('@')) {
      // Buscar en BD si hay mensajes con JID completo de este contacto
      const { data: existingMsgs } = await db
        .from('whatsapp_messages')
        .select('phone')
        .or(`phone.eq.${phone},phone.like.${digits}@%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (existingMsgs?.length) {
        // Buscar uno que tenga @lid
        const jidMsg = existingMsgs.find(m => m.phone?.includes('@lid'));
        if (jidMsg) sendTo = jidMsg.phone;
      }
    }

    const { data: inserted, error } = await db
      .from('whatsapp_messages')
      .insert({ client_id: client_id || null, phone, direction, message })
      .select('*, clients(id, first_name, last_name)');

    if (error) throw error;

    // Enviar por WhatsApp si es saliente y estamos conectados
    if (direction === 'saliente' && (whatsapp.state.status === 'open')) {
      try {
        await whatsapp.sendMessage(sendTo, message);
      } catch (err) {
        console.error('[WhatsApp] Error enviando mensaje:', err.message);
        // No fallamos la respuesta HTTP — el mensaje ya se guardó en BD
      }
    } else if (direction === 'saliente' && whatsapp.state.status !== 'open') {
      console.warn(`[WhatsApp] Mensaje guardado pero no enviado (WhatsApp ${whatsapp.state.status})`);
    }

    res.status(201).json(inserted?.[0]);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/messages/send-media — Enviar mensaje con adjunto ──────────────

router.post('/send-media', requireRole('asistente'), upload.single('file'), async (req, res, next) => {
  try {
    const { client_id, phone, caption, media_type } = req.body;
    const file = req.file;

    if (!phone) return res.status(400).json({ error: 'phone requerido' });
    if (!file) return res.status(400).json({ error: 'Archivo requerido' });

    // Determinar tipo de media
    let type = media_type || 'document';
    if (file.mimetype.startsWith('image/')) type = 'image';
    else if (file.mimetype.startsWith('audio/')) type = 'audio';
    else if (file.mimetype.startsWith('video/')) type = 'video';

    // Texto visible
    const displayText = caption?.trim()
      || (type === 'image' ? '📷 Foto' : type === 'audio' ? '🎵 Audio' : type === 'video' ? '🎬 Video' : '📎 Documento');

    // Guardar mensaje en DB
    const { data: inserted, error } = await db
      .from('whatsapp_messages')
      .insert({
        client_id: client_id || null,
        phone,
        direction: 'saliente',
        message: displayText,
      })
      .select();

    if (error) throw error;
    const msg = inserted?.[0];
    if (!msg) return res.status(500).json({ error: 'Error al crear mensaje' });

    // Registrar media en índice local
    const mediaUrl = `/uploads/whatsapp/attachments/${file.filename}`;
    mediaIndex.set(msg.id, {
      type,
      url: mediaUrl,
      mime: file.mimetype,
      filename: file.originalname,
      size: file.size,
      caption: caption || '',
    });

    // Enviar por WhatsApp
    if (whatsapp.state.status === 'open') {
      try {
        await whatsapp.sendMedia(phone, file.path, type, caption || '', file.originalname);
      } catch (err) {
        console.error('[WhatsApp] Error enviando media:', err.message);
      }
    } else {
      console.warn(`[WhatsApp] Media guardado pero no enviado (WhatsApp ${whatsapp.state.status})`);
    }

    res.status(201).json({ ...msg, media: { type, url: mediaUrl, mime: file.mimetype, filename: file.originalname, size: file.size } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/messages/read — Marcar como leído ─────────────────────────────

router.post('/read', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone requerido' });
  readState.markAsRead(phone);
  res.json({ success: true, phone });
});

// ─── POST /api/messages/link-client — Vincular teléfono a cliente ───────────

router.post('/link-client', async (req, res, next) => {
  try {
    const { phone, client_id } = req.body;
    if (!phone || !client_id) {
      return res.status(400).json({ error: 'phone y client_id requeridos' });
    }

    // Verificar que el cliente existe
    const { data: client } = await db.from('clients').select('id, phone').eq('id', client_id).limit(1);
    if (!client?.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Actualizar todos los mensajes de ese teléfono sin client_id
    const { data: updated, error } = await db
      .from('whatsapp_messages')
      .update({ client_id })
      .eq('phone', phone)
      .is('client_id', null)
      .select('id');

    if (error) throw error;

    // ★ FIX: Actualizar el teléfono del cliente si está vacío o es diferente
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const clientPhone = client[0].phone ? client[0].phone.replace(/[^0-9]/g, '') : '';
    if (!clientPhone || clientPhone !== cleanPhone) {
      const { error: updateError } = await db
        .from('clients')
        .update({ phone: cleanPhone })
        .eq('id', client_id);

      if (updateError) {
        console.error('[Messages] Error actualizando teléfono del cliente:', updateError.message);
      } else {
        console.log(`[Messages] Teléfono del cliente ${client_id} actualizado a ${cleanPhone}`);
      }
    }

    console.log(`[Messages] Teléfono ${phone} vinculado al cliente ${client_id} (${updated?.length || 0} mensajes)`);
    res.json({ success: true, updated: updated?.length || 0 });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/messages/create-client — Crear cliente desde número ─────────────

router.post('/create-client', async (req, res, next) => {
  try {
    const { phone, first_name, last_name } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'phone requerido' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const name = first_name || `Cliente ${cleanPhone.slice(-4)}`;

    const { data: newClient, error } = await db
      .from('clients')
      .insert({ first_name: name, last_name: last_name || '', phone: cleanPhone })
      .select('id')
      .limit(1);

    if (error) throw error;

    if (newClient?.length) {
      // Vincular automáticamente los mensajes de este teléfono
      await db
        .from('whatsapp_messages')
        .update({ client_id: newClient[0].id })
        .eq('phone', phone)
        .is('client_id', null);
    }

    console.log(`[Messages] Cliente creado desde teléfono ${phone}: ${name} (ID ${newClient?.[0]?.id})`);
    res.json({ success: true, client: newClient?.[0] || null });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/messages/conversation/:phone ─────────────────────────────

router.delete('/conversation/:phone', requireRole('admin'), async (req, res, next) => {
  try {
    const phone = req.params.phone;

    // Obtener IDs de mensajes a eliminar (para limpiar mediaIndex)
    const { data: toDelete } = await db
      .from('whatsapp_messages')
      .select('id')
      .or(`phone.eq.${phone},phone.like.${phone.replace(/[^0-9]/g, '')}@%`);

    if (!toDelete?.length) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Limpiar media de cada mensaje
    for (const msg of toDelete) {
      mediaIndex.remove(msg.id);
    }

    const { error } = await db
      .from('whatsapp_messages')
      .delete()
      .or(`phone.eq.${phone},phone.like.${phone.replace(/[^0-9]/g, '')}@%`);

    if (error) throw error;

    console.log(`[Messages] Conversación ${phone} eliminada (${toDelete.length} mensajes)`);
    res.json({ success: true, deleted: toDelete.length });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/messages/:id ────────────────────────────────────────────────

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { data: existing } = await db
      .from('whatsapp_messages')
      .select('id')
      .eq('id', req.params.id)
      .limit(1);

    if (!existing?.length) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    const { error } = await db.from('whatsapp_messages').delete().eq('id', req.params.id);
    if (error) throw error;

    // Limpiar media index
    mediaIndex.remove(req.params.id);

    res.json({ message: 'Mensaje eliminado' });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────
 *  POST /lid/resolve — Resolver LID a número de teléfono real
 * ═════════════════════════════════════════════════════════════ */
router.post('/lid/resolve', async (req, res, next) => {
  try {
    const { lid, phone } = req.body;

    if (!lid || !phone) {
      return res.status(400).json({ error: 'Se requieren lid y phone' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      return res.status(400).json({ error: 'Número de teléfono inv\u00e1lido' });
    }

    // 1. Actualizar caché en memoria (ambas direcciones) y persistir
    const normLid = lid.includes('@') ? lid : `${lid}@lid`;
    whatsapp.state.lidToPhone.set(normLid, cleanPhone);
    whatsapp.state.phoneToLid.set(cleanPhone, normLid);
    if (typeof whatsapp.saveLidCache === 'function') whatsapp.saveLidCache();

    // 2. Actualizar mensajes existentes en la BD
    const { error: errUpdate } = await db
      .from('whatsapp_messages')
      .update({ phone: cleanPhone })
      .eq('phone', normLid);

    if (errUpdate) {
      console.error('[LID] Error actualizando mensajes:', errUpdate.message);
    } else {
      const { count } = await db
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('phone', normLid);
      console.log(`[LID] ${normLid} resuelto a ${cleanPhone}, ${count} mensajes actualizados`);
    }

    // 3. También actualizar si había sin @lid
    const lidUser = normLid.split('@')[0];
    const { error: errUpdate2 } = await db
      .from('whatsapp_messages')
      .update({ phone: cleanPhone })
      .eq('phone', lidUser);

    res.json({ success: true, phone: cleanPhone });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
