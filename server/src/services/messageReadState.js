/**
 * ═══════════════════════════════════════════════
 *  messageReadState.js — Estado de lectura
 * ═══════════════════════════════════════════════
 *
 *  Almacena en memoria la última vez que se
 *  "leyeron" los mensajes de cada teléfono.
 *  No es persistente (se pierde al reiniciar),
 *  pero resuelve el problema inmediato del badge
 *  de mensajes no leídos.
 *
 *  A futuro: migrar a una columna "read" en la BD.
 */

// Map<telefono, timestamp_ms>
const readLog = new Map();

/**
 * Marca todos los mensajes de un teléfono como leídos.
 */
function markAsRead(phone) {
  readLog.set(phone, Date.now());
}

/**
 * Cuenta los mensajes entrantes NO leídos para un teléfono.
 * @param {Array} messages - Todos los mensajes de ese teléfono
 * @param {string} phone
 */
function getUnreadCount(messages, phone) {
  const lastRead = readLog.get(phone) || 0;
  return (messages || []).filter(
    (m) => m.direction === 'entrante' && new Date(m.created_at).getTime() > lastRead
  ).length;
}

/**
 * Cuenta el total de mensajes entrantes NO leídos en el sistema.
 * @param {Array} allMessages - Todos los mensajes del sistema
 */
function getTotalUnread(allMessages) {
  // Agrupar por teléfono
  const byPhone = {};
  for (const m of allMessages || []) {
    if (!byPhone[m.phone]) byPhone[m.phone] = [];
    byPhone[m.phone].push(m);
  }
  let total = 0;
  for (const [phone, msgs] of Object.entries(byPhone)) {
    total += getUnreadCount(msgs, phone);
  }
  return total;
}

module.exports = { markAsRead, getUnreadCount, getTotalUnread };
