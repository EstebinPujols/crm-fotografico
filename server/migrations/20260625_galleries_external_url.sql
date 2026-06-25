-- ═══════════════════════════════════════════════════
--  Migration: Gallery external link + new statuses (2026-06-25)
-- ═══════════════════════════════════════════════════
--  EJECUTAR EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════

-- 1. Agregar columna external_url
ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS external_url TEXT;

-- 2. Migrar status existentes a los nuevos valores
UPDATE public.galleries SET status = 'borrador' WHERE status = 'draft';
UPDATE public.galleries SET status = 'completado' WHERE status = 'active';
UPDATE public.galleries SET status = 'borrador' WHERE status = 'archived';
