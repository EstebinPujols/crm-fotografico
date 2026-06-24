/**
 * ═══════════════════════════════════════════════
 *  whatsapp.js — Servicio WhatsApp (Baileys)
 * ═══════════════════════════════════════════════
 *
 *  Conexión persistente a WhatsApp Web usando
 *  @whiskeysockets/baileys.
 *
 *  Soporta: texto, imágenes, audios, videos y documentos.
 */

const { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const QR = require('qrcode');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const mediaIndex = require('./mediaIndex');

// ─── Estado compartido ───────────────────────────────────────────────────────

const state = {
  status: 'disconnected',
  qrData: null,
  phone: null,
  lastError: null,
  lidToPhone: new Map(),
  phoneToLid: new Map(),
  processedIds: new Set(),
  _sock: null,
};

let onStatusChange = null;
function setStatusCallback(cb) { onStatusChange = cb; }

// ─── Helpers JID ──────────────────────────────────────────────────────────────

function jidToUser(jid) {
  return jid ? jid.split('@')[0] : '';
}

function resolvePhone(jid) {
  if (!jid) return '';
  const user = jidToUser(jid);
  const digits = user.replace(/[^0-9]/g, '');
  
  // Si tiene @lid, buscar resolución en caché
  if (jid.includes('@lid')) {
    const normJid = jidNormalizedUser(jid);
    const cachedPhone = state.lidToPhone.get(normJid) || state.lidToPhone.get(jid);
    if (cachedPhone) return cachedPhone; // Número real
    return digits || normJid; // Solo los dígitos del LID
  }
  
  return digits;
}

/**
 * Construye un JID de WhatsApp válido para enviar mensajes.
 */
function buildJid(to) {
  if (!to) throw new Error('Destinatario vacío');
  
  // JID completo ya
  if (to.includes('@')) return to;
  
  const digits = to.replace(/[^0-9]/g, '');
  if (!digits) throw new Error('Destinatario inv\u00e1lido: ' + to);
  
  // Buscar en caché inverso: si este número tiene un LID conocido, usar el JID de LID
  const knownLid = state.phoneToLid.get(digits);
  if (knownLid) {
    return knownLid; // Enviar al JID de LID (contacto migrado)
  }
  
  // Números >=13 dígitos → son LIDs de WhatsApp, no teléfonos reales
  if (digits.length >= 13) {
    // Buscar si tenemos el JID completo en caché (resolución manual)
    for (const [lid, phone] of state.lidToPhone.entries()) {
      if (lid.includes(digits)) return `${phone}@s.whatsapp.net`; // Resuelto
      if (lid.replace('@lid','') === digits) return `${phone}@s.whatsapp.net`; // Resuelto
    }
    return `${digits}@lid`;
  }
  
  return `${digits}@s.whatsapp.net`;
}

// ─── Directorio de autenticación ─────────────────────────────────────────────

const AUTH_DIR = path.join(__dirname, '../../whatsapp_auth');

// ─── Caché persistente LID→teléfono ───────────────────────────────────────────

const LID_CACHE_PATH = path.join(__dirname, '../../whatsapp_auth/lid_cache.json');

/** Cargar caché desde disco */
function loadLidCache() {
  try {
    if (fs.existsSync(LID_CACHE_PATH)) {
      const raw = fs.readFileSync(LID_CACHE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (data.lidToPhone) {
        for (const [k, v] of Object.entries(data.lidToPhone)) {
          state.lidToPhone.set(k, v);
        }
      }
      if (data.phoneToLid) {
        for (const [k, v] of Object.entries(data.phoneToLid)) {
          state.phoneToLid.set(k, v);
        }
      }
      console.log(`[WhatsApp] Caché LID cargada: ${state.lidToPhone.size} LIDs, ${state.phoneToLid.size} teléfonos`);
    }
  } catch (e) {
    console.error('[WhatsApp] Error cargando caché LID:', e.message);
  }
}

/** Guardar caché a disco */
function saveLidCache() {
  try {
    const data = {
      lidToPhone: Object.fromEntries(state.lidToPhone),
      phoneToLid: Object.fromEntries(state.phoneToLid),
    };
    fs.writeFileSync(LID_CACHE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[WhatsApp] Error guardando caché LID:', e.message);
  }
}

// ─── Directorios de uploads ───────────────────────────────────────────────────

const UPLOAD_DIRS = {
  image:  path.join(__dirname, '../../uploads/whatsapp/images'),
  audio:  path.join(__dirname, '../../uploads/whatsapp/audio'),
  video:  path.join(__dirname, '../../uploads/whatsapp/video'),
  document: path.join(__dirname, '../../uploads/whatsapp/documents'),
};

// Nombre de directorio URL para cada tipo (con match de subdirectorios)
const URL_DIRS = {
  image: 'images',
  audio: 'audio',
  video: 'video',
  document: 'documents',
};

// Asegurar que existen
for (const dir of Object.values(UPLOAD_DIRS)) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Mapeo de tipos Baileys → nuestros tipos ──────────────────────────────────

const MEDIA_TYPE_MAP = {
  imageMessage:  'image',
  audioMessage:  'audio',
  videoMessage:  'video',
  documentMessage: 'document',
};

// ─── Descargar y guardar media ────────────────────────────────────────────────

/**
 * Descarga un mensaje multimedia de WhatsApp y lo guarda en disco.
 * @param {object} msg — mensaje completo de Baileys
 * @returns {object|null} { mediaUrl, mimeType, fileName, fileSize, mediaType }
 */
async function downloadMedia(msg) {
  const msgKeys = Object.keys(msg.message || {});
  const mediaKey = msgKeys.find(k => MEDIA_TYPE_MAP[k]);
  if (!mediaKey) return null;

  const mediaType = MEDIA_TYPE_MAP[mediaKey];
  const mediaContent = msg.message[mediaKey];
  if (!mediaContent) return null;

  // Determinar extensión
  const mimeType = mediaContent.mimetype || 'application/octet-stream';
  const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
  const extMap = {
    'audio/ogg; codecs=opus': 'ogg',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
  };
  const finalExt = extMap[mimeType] || ext || 'bin';

  // Nombre original o generado
  const originalName = mediaContent.fileName || mediaContent.filename || `media_${uuidv4().slice(0,8)}.${finalExt}`;

  // Guardar archivo
  const fileId = uuidv4();
  const fileName = `${fileId}.${finalExt}`;
  const targetDir = UPLOAD_DIRS[mediaType] || UPLOAD_DIRS.document;
  const filePath = path.join(targetDir, fileName);

  try {
    const stream = await downloadContentFromMessage(mediaContent, mediaKey.replace('Message', ''));
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(filePath, buffer);

    // URL relativa para servir via Express static
    const urlDir = URL_DIRS[mediaType] || `${mediaType}s`;
    const mediaUrl = `/uploads/whatsapp/${urlDir}/${fileName}`;

    console.log(`[WhatsApp] Media descargado: ${mediaUrl} (${(buffer.length / 1024).toFixed(1)}KB)`);

    return {
      url: mediaUrl,
      mime: mimeType,
      filename: originalName,
      type: mediaType,
      size: buffer.length,
      caption: mediaContent.caption || '',
    };
  } catch (err) {
    console.error(`[WhatsApp] Error descargando ${mediaKey}:`, err.message);
    return null;
  }
}

// ─── Iniciar conexión ─────────────────────────────────────────────────────────

async function start() {
  if (state._sock) {
    console.log('[WhatsApp] Ya hay una conexión activa');
    return;
  }

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Cargar caché LID persistida
  loadLidCache();

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: authState,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    emitOwnWhatsapp: false,
    // No sincronizar historial completo para evitar mensajes duplicados
    version: [2, 3000, 10159136478],
  });

  state._sock = sock;
  state.status = 'connecting';
  state.qrData = null;
  state.lastError = null;
  _emitStatus();

  // ─── Resolver LID → teléfono vía signalRepository.lidMapping ───────────────
  async function resolveLidToPhone(lidJid) {
    try {
      if (!sock.signalRepository?.lidMapping) {
        console.warn('[WhatsApp] signalRepository.lidMapping no disponible');
        return null;
      }
      const pn = await sock.signalRepository.lidMapping.getPNForLID(lidJid);
      if (pn) {
        const phone = pn.split('@')[0]?.replace(/[^0-9]/g, '');
        if (phone && phone.length >= 10) {
          console.log('[WhatsApp] LID resuelto vía signalRepository:', lidJid, '→', phone);
          state.lidToPhone.set(lidJid, phone);
          state.phoneToLid.set(phone, lidJid);
          saveLidCache();
          return phone;
        }
      }
    } catch (e) {
      console.error('[WhatsApp] Error resolviendo LID vía signalRepository:', e.message);
    }
    return null;
  }

  state.resolveLidToPhone = resolveLidToPhone;

  // ─── QR + Conexión ──────────────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      try {
        state.qrData = await QR.toDataURL(qr, { width: 300, margin: 2 });
        state.status = 'qr';
        _emitStatus();
        console.log('[WhatsApp] QR generado');
      } catch (err) {
        console.error('[WhatsApp] Error generando QR:', err.message);
      }
    }

    if (connection) {
      state.status = connection === 'close' ? 'disconnected' : connection;
    }

    if (connection === 'open') {
      state.phone = sock.user?.id?.split(':')[0] || 'Desconocido';
      console.log('[WhatsApp] Conectado como', state.phone);

      // ★ Escanear LIDs pendientes en BD al reconectar
      setTimeout(async () => {
        try {
          // Escanear LIDs cacheados y actualizar DB
          for (const [lidJid, phone] of state.lidToPhone.entries()) {
            if (!lidJid.includes('@lid')) continue;
            const lidDigits = lidJid.replace('@lid', '').replace(/[^0-9]/g, '');
            if (!lidDigits) continue;
            const { data: msgs } = await db
              .from('whatsapp_messages')
              .select('id')
              .eq('phone', lidDigits)
              .limit(10);
            if (msgs?.length) {
              await db.from('whatsapp_messages')
                .update({ phone })
                .eq('phone', lidDigits);
              console.log(`[WhatsApp] Startup: LID ${lidDigits} → ${phone}, ${msgs.length} msgs actualizados`);
            }
          }

          // Consultar signalRepository para todo LID no resuelto en la BD
          // Buscar mensajes cuyo phone tenga @lid (formato LID JID)
          const { data: lidMsgs } = await db
            .from('whatsapp_messages')
            .select('phone')
            .like('phone', '%@lid')
            .order('created_at', { ascending: false })
            .limit(50);
          const seen = new Set();
          for (const m of lidMsgs || []) {
            const raw = (m.phone || '').includes('@') ? m.phone : `${m.phone}@lid`;
            if (seen.has(raw) || state.lidToPhone.has(raw)) continue;
            seen.add(raw);
            try {
              const pn = await sock.signalRepository?.lidMapping?.getPNForLID(raw);
              if (pn) {
                const phoneDigits = pn.split('@')[0]?.replace(/[^0-9]/g, '');
                if (phoneDigits && phoneDigits.length >= 10) {
                  state.lidToPhone.set(raw, phoneDigits);
                  state.phoneToLid.set(phoneDigits, raw);
                  await db.from('whatsapp_messages')
                    .update({ phone: phoneDigits })
                    .or(`phone.eq.${m.phone},phone.eq.${raw}`);
                  console.log('[WhatsApp] LID resuelto en startup via signalRepo:', raw, '→', phoneDigits);
                }
              }
            } catch (e) {
              // ignorar — signalRepository puede no tener aún el mapeo
            }
          }
          saveLidCache();
        } catch (e) {
          console.error('[WhatsApp] Error en scan startup:', e.message);
        }
      }, 3000);
    }

    if (lastDisconnect) {
      const reason = lastDisconnect.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('[WhatsApp] Sesión cerrada — nuevo QR');
        state.phone = null;
        state.lastError = 'Sesión cerrada desde el teléfono';
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        } catch (_) {}
        try { state._sock?.ws?.close(); } catch (_) {}
        state._sock = null;
        state.status = 'disconnected';
        _emitStatus();
        setTimeout(() => start(), 2000);
        return;
      } else if (reason === DisconnectReason.restartRequired) {
        console.log('[WhatsApp] Reiniciando conexión…');
        state.status = 'connecting';
        _emitStatus();
        try { state._sock?.ws?.close(); } catch (_) {}
        state._sock = null;
        setTimeout(() => start(), 1000);
        return;
      } else {
        console.log('[WhatsApp] Desconectado, razón:', reason || 'desconocida');
        state.status = 'disconnected';
        state.lastError = lastDisconnect.error?.message || 'Desconectado';
        _emitStatus();
        setTimeout(() => { state._sock = null; start(); }, 5000);
        return;
      }
    }
    _emitStatus();
  });

  // ─── Guardar credenciales ─────────────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ─── Contactos: caché LID → teléfono ──────────────────────────────────────────
  const updateContactCache = (contacts) => {
    console.log('[WhatsApp] contacts.upsert/update:', contacts.length, 'contactos');
    let hasNewMapping = false;
    for (const c of contacts) {
      // Caso: contacto con lid + id tradicional → tenemos el mapeo
      if (c.lid && c.id) {
        const phone = c.id.split('@')[0]?.replace(/[^0-9]/g, '');
        if (phone && phone.length >= 10) {
          const lidNorm = jidNormalizedUser(c.lid);
          const idNorm = jidNormalizedUser(c.id);
          console.log('[WhatsApp] Mapeo LID:', lidNorm, '→', phone);
          state.lidToPhone.set(lidNorm, phone);
          state.lidToPhone.set(idNorm, phone);
          state.phoneToLid.set(phone, lidNorm);
          saveLidCache();
          hasNewMapping = true;
        } else {
          console.log('[WhatsApp] LID sin phone:', c.lid, '→', phone || 'inválido');
        }
      } else if (c.lid && !c.id) {
        console.log('[WhatsApp] Contacto solo LID (sin id):', jidNormalizedUser(c.lid));
      } else if (c.id && !c.lid) {
        // Contacto tradicional sin LID — no nos interesa
      }
    }
    if (contacts.length > 0) {
      console.log('[WhatsApp] Contactos recibidos — primer contacto:', JSON.stringify(contacts[0]).slice(0, 200));
    }

    // ★ Retroactivo: actualizar mensajes existentes que ahora tienen resolución
    if (hasNewMapping && state._sock) {
      // No bloqueamos, lo hacemos en background
      setTimeout(async () => {
        try {
          for (const [lid, phone] of state.lidToPhone.entries()) {
            if (!lid.includes('@lid')) continue;
            // resolvePhone guarda solo dígitos sin @lid → buscar así en BD
            const lidDigits = lid.replace('@lid', '').replace(/[^0-9]/g, '');
            if (!lidDigits) continue;
            const { data: msgs } = await db
              .from('whatsapp_messages')
              .select('id')
              .eq('phone', lidDigits)
              .limit(10);
            if (msgs?.length) {
              await db.from('whatsapp_messages')
                .update({ phone })
                .eq('phone', lidDigits);
              console.log(`[WhatsApp] LID ${lidDigits} resuelto → ${phone}, ${msgs.length} mensajes actualizados`);
            }
          }
        } catch (e) {
          // ignorar errores en background
        }
      }, 1000);
    }
  };

  sock.ev.on('contacts.upsert', updateContactCache);
  sock.ev.on('contacts.update', updateContactCache);

  // ─── Mensajes entrantes ─────────────────────────────────────────────────────
  // ─── Mensajes entrantes/salientes ─────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      // Solo notificaciones en tiempo real — ignorar históricos
      if (type !== 'notify') continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;

      // ★ Dedup: este ID ya fue procesado (p.ej. enviado desde la API y re-emitido por Baileys)
      const msgId = msg.key.id;
      if (state.processedIds.has(msgId)) continue;
      state.processedIds.add(msgId);

      // Controlar crecimiento del Set
      if (state.processedIds.size > 5000) {
        const arr = [...state.processedIds].slice(-2500);
        state.processedIds = new Set(arr);
      }

      const jid = msg.key.remoteJid || '';
      let phone = resolvePhone(jid);

      // ★ Si es LID no resuelto, intentar resolverlo vía USync
      if (!phone || (jid.includes('@lid') && phone.length >= 13 && !state.lidToPhone.has(jid))) {
        try {
          const resolved = await resolveLidToPhone(jid);
          if (resolved) phone = resolved;
        } catch (_) {}
      }

      if (!phone) continue;

      // Extraer texto (caption o texto directo)
      const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || msg.message?.videoMessage?.caption
        || msg.message?.documentMessage?.caption
        || '';

      // Detectar tipo de mensaje
      const msgKeys = Object.keys(msg.message || {});
      const mediaKey = msgKeys.find(k => MEDIA_TYPE_MAP[k]);
      const messageType = mediaKey ? MEDIA_TYPE_MAP[mediaKey] : 'text';

      // Texto para mostrar en UI
      const displayText = messageType === 'audio' ? '🎵 Mensaje de voz'
        : messageType === 'image' ? (text || '📷 Foto')
        : messageType === 'video' ? (text || '🎬 Video')
        : messageType === 'document' ? (text || '📎 Documento')
        : text;

      if (!displayText && !mediaKey) continue;

      try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        let client = null;

        if (!phone.includes('@lid')) {
          const { data: clients } = await db
            .from('clients')
            .select('id, first_name, last_name, phone')
            .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`);

          client = clients?.[0] || null;
        }

        // ★ Guardar mensaje
        // resolvePhone ya devolvió solo dígitos o el número real
        const storedPhone = cleanPhone || phone

        const { data: inserted, error } = await db
          .from('whatsapp_messages')
          .insert({
            client_id: client?.id || null,
            phone: storedPhone,
            direction: msg.key.fromMe ? 'saliente' : 'entrante',
            message: displayText,
          })
          .select();

        if (error) {
          console.error('[WhatsApp] Error guardando mensaje:', error.message);
          continue;
        }

        const insertedMsg = inserted?.[0];
        if (!insertedMsg) continue;

        // Si tiene media, descargar y registrar en índice
        if (mediaKey && insertedMsg.id) {
          const mediaMeta = await downloadMedia(msg);
          if (mediaMeta) {
            mediaIndex.set(insertedMsg.id, mediaMeta);
          }
        }

        if (client) {
          console.log(`[WhatsApp] Mensaje de ${client.first_name} (${messageType}) ✅`);
        } else {
          console.log(`[WhatsApp] Mensaje de ${phone} (${messageType}) guardado`);
        }
      } catch (err) {
        console.error('[WhatsApp] Error procesando mensaje entrante:', err.message);
      }
    }
  });
}

// ─── Enviar mensaje (texto) ────────────────────────────────────────────────────

async function sendMessage(to, text) {
  if (!state._sock || state.status !== 'open') {
    throw new Error('WhatsApp no está conectado');
  }
  const jid = buildJid(to);
  const logTo = jidToUser(jid);
  const result = await state._sock.sendMessage(jid, { text });
  // Registrar en dedup para que el evento messages.upsert no lo duplique
  if (result?.key?.id) state.processedIds.add(result.key.id);
  console.log(`[WhatsApp] Mensaje enviado a ${logTo} ✅`);
  return { success: true, to: logTo };
}

/**
 * Enviar un archivo multimedia desde el servidor a un contacto.
 * @param {string} to — número de teléfono
 * @param {string} filePath — ruta absoluta al archivo en el servidor
 * @param {string} mediaType — 'image' | 'audio' | 'video' | 'document'
 * @param {string} [caption] — texto opcional
 * @param {string} [filename] — nombre opcional (para documentos)
 */
async function sendMedia(to, filePath, mediaType, caption = '', filename = '') {
  if (!state._sock || state.status !== 'open') {
    throw new Error('WhatsApp no está conectado');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }

  const jid = buildJid(to);
  const logTo = jidToUser(jid);
  const buffer = fs.readFileSync(filePath);

  let messageContent;

  switch (mediaType) {
    case 'image':
      messageContent = { image: buffer, caption: caption || undefined };
      break;
    case 'audio':
      messageContent = { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true };
      break;
    case 'video':
      messageContent = { video: buffer, caption: caption || undefined };
      break;
    case 'document':
    default:
      messageContent = {
        document: buffer,
        caption: caption || undefined,
        fileName: filename || path.basename(filePath),
        mimetype: 'application/octet-stream',
      };
      break;
  }

  const result = await state._sock.sendMessage(jid, messageContent);
  // Registrar en dedup
  if (result?.key?.id) state.processedIds.add(result.key.id);
  console.log(`[WhatsApp] ${mediaType} enviado a ${logTo} ✅`);
  return { success: true, to: logTo };
}

// ─── Cerrar sesión ─────────────────────────────────────────────────────────────

async function logout() {
  if (state._sock) {
    try { state._sock.ws?.close(); } catch (_) {}
    state._sock = null;
  }
  state.status = 'disconnected';
  state.qrData = null;
  state.phone = null;
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  } catch (_) {}
  state.lidToPhone.clear();
  state.phoneToLid.clear();
  state.processedIds.clear();
  // Eliminar caché persistida
  try { if (fs.existsSync(LID_CACHE_PATH)) fs.rmSync(LID_CACHE_PATH); } catch (_) {}
  _emitStatus();
  console.log('[WhatsApp] Sesión cerrada');
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

function _emitStatus() {
  if (onStatusChange) onStatusChange({ ...state });
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  state,
  start,
  sendMessage,
  sendMedia,
  logout,
  setStatusCallback,
  resolvePhone,
  saveLidCache,
};
