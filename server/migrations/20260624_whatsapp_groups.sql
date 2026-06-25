-- ═══════════════════════════════════════════════════
--  Migration: WhatsApp group message support (2026-06-24)
-- ═══════════════════════════════════════════════════
--  EJECUTAR EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════
--
--  La columna is_group permite identificar y filtrar
--  mensajes provenientes de grupos de WhatsApp (@g.us).

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_whatsapp_is_group ON public.whatsapp_messages(is_group);
