-- ═══════════════════════════════════════════════════
--  Migration: Gallery external link + new statuses (2026-06-25)
-- ═══════════════════════════════════════════════════
--  EJECUTAR EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════

-- 1. Agregar columna external_url
ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS external_url TEXT;

-- 1a. Eliminar CHECK constraint existente y recrearlo con nuevos status
ALTER TABLE public.galleries DROP CONSTRAINT IF EXISTS galleries_status_check;
ALTER TABLE public.galleries ADD CONSTRAINT galleries_status_check 
  CHECK (status IN ('borrador', 'editando', 'completado'));



-- 2. Migrar status existentes a los nuevos valores
UPDATE public.galleries SET status = 'borrador' WHERE status = 'draft';
UPDATE public.galleries SET status = 'completado' WHERE status = 'active';
UPDATE public.galleries SET status = 'borrador' WHERE status = 'archived';
