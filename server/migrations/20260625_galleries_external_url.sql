-- ═══════════════════════════════════════════════════
--  Migration: Gallery external link + new statuses (2026-06-25)
-- ═══════════════════════════════════════════════════
--  EJECUTAR EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════

-- 1. Agregar columna external_url
ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS external_url TEXT;

-- 2. Eliminar CHECK constraint viejo (si existe)
ALTER TABLE public.galleries DROP CONSTRAINT IF EXISTS galleries_status_check;

-- 3. Migrar status existentes a los nuevos valores
UPDATE public.galleries SET status = 'borrador' WHERE status = 'draft';
UPDATE public.galleries SET status = 'completado' WHERE status = 'active';
UPDATE public.galleries SET status = 'borrador' WHERE status = 'archived';

-- 4. Crear constraint nuevo con los valores correctos
ALTER TABLE public.galleries ADD CONSTRAINT galleries_status_check 
  CHECK (status IN ('borrador', 'editando', 'completado'));
