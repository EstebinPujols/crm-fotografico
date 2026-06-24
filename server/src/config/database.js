/**
 * Configuración de base de datos — Supabase via REST API.
 *
 * En vez de Knex (que necesita conexión TCP directa a PostgreSQL),
 * usamos el cliente de Supabase que opera via HTTP/HTTPS.
 *
 * La API REST de Supabase (PostgREST) funciona sobre IPv4,
 * resolviendo el problema de IPv6 en Cumora.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[DB] Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY');
  process.exit(1);
}

/**
 * Cliente admin de Supabase (bypass de RLS).
 * Se usa en todas las operaciones de backend.
 *
 * @example
 *   const { data, error } = await db.from('clients').select('*')
 */
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

module.exports = supabase;
