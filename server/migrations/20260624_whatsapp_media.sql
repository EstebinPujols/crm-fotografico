-- ═══════════════════════════════════════════════════
--  Migration: WhatsApp media support (2026-06-24)
-- ═══════════════════════════════════════════════════
--  EJECUTAR EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════

-- 1) message_type — tipo de mensaje (text, image, audio, video, document)
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'text';

-- 2) media_url — ruta al archivo multimedia (ej: /uploads/whatsapp/images/uuid.jpg)
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 3) media_mime — tipo MIME del archivo
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_mime VARCHAR(100);

-- 4) media_filename — nombre original del archivo (ej: "foto_vacaciones.jpg")
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_filename VARCHAR(255);

-- 5) media_size — tamaño en bytes
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_size BIGINT;

-- 6) Índices
CREATE INDEX IF NOT EXISTS idx_msg_type ON public.whatsapp_messages(message_type);
