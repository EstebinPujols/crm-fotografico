/**
 * mediaIndex.js — Índice local de archivos multimedia
 *
 * Almacena metadatos de media (audio, imagen, video, documento)
 * en un archivo JSON local ya que no tenemos columnas extra en
 * la tabla whatsapp_messages.
 *
 * Estructura:
 *   { [messageId]: { type, url, mime, filename, size, caption? } }
 */

const path = require('path');
const fs = require('fs');

const INDEX_PATH = path.join(__dirname, '../../uploads/whatsapp/media_index.json');

// ─── Cargar índice ────────────────────────────────────────────────────────────

let _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    if (fs.existsSync(INDEX_PATH)) {
      const raw = fs.readFileSync(INDEX_PATH, 'utf-8');
      _cache = JSON.parse(raw);
    } else {
      _cache = {};
    }
  } catch {
    _cache = {};
  }
  return _cache;
}

function save() {
  const dir = path.dirname(INDEX_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(_cache, null, 2), 'utf-8');
}

// ─── API pública ──────────────────────────────────────────────────────────────

const mediaIndex = {
  /**
   * Registrar un archivo multimedia para un mensaje.
   * @param {string} messageId — UUID del mensaje en whatsapp_messages
   * @param {object} meta — { type, url, mime, filename, size, caption? }
   */
  set(messageId, meta) {
    const idx = load();
    idx[messageId] = {
      type: meta.type || 'unknown',       // image | audio | video | document
      url: meta.url,                       // ruta accesible vía static
      mime: meta.mime || 'application/octet-stream',
      filename: meta.filename || 'archivo',
      size: meta.size || 0,
      caption: meta.caption || '',
    };
    _cache = idx;
    save();
  },

  /**
   * Obtener metadata de un mensaje.
   */
  get(messageId) {
    const idx = load();
    return idx[messageId] || null;
  },

  /**
   * Eliminar del índice.
   */
  remove(messageId) {
    const idx = load();
    delete idx[messageId];
    _cache = idx;
    save();
  },

  /**
   * Obtener todos los registros.
   */
  all() {
    return load();
  },

  /**
   * Obtener metadata para múltiples mensajes.
   * @param {string[]} messageIds
   * @returns {object} { [id]: meta }
   */
  getMany(messageIds) {
    const idx = load();
    const result = {};
    for (const id of messageIds) {
      if (idx[id]) result[id] = idx[id];
    }
    return result;
  },
};

module.exports = mediaIndex;
