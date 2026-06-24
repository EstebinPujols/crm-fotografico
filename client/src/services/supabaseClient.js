/**
 * supabaseClient.js — Cliente de Supabase para el frontend
 *
 * Este archivo crea y exporta el cliente de Supabase que usaremos
 * en toda la app para autenticación.
 *
 * ⚠️ NO TIENES QUE MODIFICAR NADA AQUÍ ⚠️
 * Es infraestructura. Yo lo creo completo.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Configuración ───
// Estas variables están definidas en el .env del frontend
// Vite expone las que empiezan con VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabaseClient] Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY'
  );
}

// ─── Cliente público de Supabase ───
// Usa la anon key (pública, segura con RLS)
// Esto es lo que se usa en el frontend para auth
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true, // Guarda sesión en localStorage automáticamente
  },
});

export default supabase;
