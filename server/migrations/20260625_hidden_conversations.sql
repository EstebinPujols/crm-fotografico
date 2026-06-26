-- ═══════════════════════════════════════════════════
--  Migration: Hidden/blacklisted conversations (2026-06-25)
-- ═══════════════════════════════════════════════════
--  EJECUTAR EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hidden_conversations (
  phone VARCHAR(30) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hidden_conversations_phone ON public.hidden_conversations(phone);
