-- ═══════════════════════════════════════════════════
--  Migration: Baileys message dedup (2026-06-24)
-- ═══════════════════════════════════════════════════
--  EJECUTAR EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════

-- 1) baileys_id — ID único del mensaje en Baileys (msg.key.id)
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS baileys_id TEXT;

-- 2) Índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_baileys_id ON public.whatsapp_messages(baileys_id)
  WHERE baileys_id IS NOT NULL;
