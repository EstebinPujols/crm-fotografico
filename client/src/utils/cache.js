// ─── Cache local para conversaciones y mensajes ─────────────────────────────
// Guarda todo en localStorage para carga instantánea y sync en background

const CACHE_KEY_CONVS = 'crm_conv_cache';
const CACHE_KEY_MSGS = (phone) => `crm_msgs_${phone}`;
const CACHE_KEY_TIMESTAMP = 'crm_cache_ts';

const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export function loadConversationsCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY_CONVS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConversationsCache(conversations) {
  try {
    localStorage.setItem(CACHE_KEY_CONVS, JSON.stringify(conversations));
    localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
  } catch {
    // localStorage lleno — ignorar
  }
}

export function loadMessagesCache(phone) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_MSGS(phone));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMessagesCache(phone, messages) {
  try {
    localStorage.setItem(CACHE_KEY_MSGS(phone), JSON.stringify(messages));
  } catch {
    // ignorar
  }
}

export function isCacheStale() {
  try {
    const ts = parseInt(localStorage.getItem(CACHE_KEY_TIMESTAMP) || '0', 10);
    return Date.now() - ts > CACHE_TTL;
  } catch {
    return true;
  }
}

export function clearMessagesCache(phone) {
  try {
    localStorage.removeItem(CACHE_KEY_MSGS(phone));
  } catch {
    // ignorar
  }
}
