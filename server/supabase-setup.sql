-- ═══════════════════════════════════════════════
-- PhotoCRM — Setup completo para Supabase
-- Pegar en: SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════
-- DROP existentes (tablas vacías con esquema incorrecto)
-- ═══════════════════════════════════
DROP TABLE IF EXISTS public.gallery_photos CASCADE;
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.galleries CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ═══════════════════════ 1. users ═══════════════════════
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'asistente'
    CHECK (role IN ('admin', 'fotografo', 'asistente', 'cliente')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════ 2. clients ═══════════════════════
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  address TEXT,
  social_media JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════ 3. settings ═══════════════════════
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- ═══════════════════════ 4. appointments ═══════════════════════
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location VARCHAR(255),
  session_type VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- ═══════════════════════ 5. projects ═══════════════════════
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'fotografiando', 'seleccion', 'edicion', 'entregado', 'finalizado')),
  delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- ═══════════════════════ 6. payments ═══════════════════════
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'parcial', 'pagado')),
  payment_method VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ═══════════════════════ 7. galleries ═══════════════════════
CREATE TABLE public.galleries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  share_token VARCHAR(64) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_galleries_client_id ON public.galleries(client_id);
CREATE INDEX IF NOT EXISTS idx_galleries_project_id ON public.galleries(project_id);
CREATE INDEX IF NOT EXISTS idx_galleries_status ON public.galleries(status);

-- ═══════════════════════ 8. gallery_photos ═══════════════════════
CREATE TABLE public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  filename VARCHAR(255),
  size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_id ON public.gallery_photos(gallery_id);

-- ═══════════════════════ 9. whatsapp_messages ═══════════════════════
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  phone VARCHAR(30) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('entrante', 'saliente')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  media_url TEXT,
  media_mime VARCHAR(100),
  media_filename VARCHAR(255),
  media_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_client_id ON public.whatsapp_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON public.whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_created_at ON public.whatsapp_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_msg_type ON public.whatsapp_messages(message_type);

-- ═══════════════════════════════════
-- TRIGGER: crear usuario automáticamente
-- cuando alguien se registra via Supabase Auth
-- ═══════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (supabase_uid, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'asistente'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════
-- SEED DATA (datos de prueba)
-- ═══════════════════════════════════

-- 1. Usuarios demo
INSERT INTO public.users (id, name, email, password_hash, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Admin Principal', 'admin@photocrm.com',
   '$2b$10$dummy-hash-que-sera-reemplazado', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'María Fotógrafa', 'maria@photocrm.com',
   '$2b$10$dummy-hash-que-sera-reemplazado', 'fotografo'),
  ('a0000000-0000-0000-0000-000000000003', 'Carlos Asistente', 'carlos@photocrm.com',
   '$2b$10$dummy-hash-que-sera-reemplazado', 'asistente')
ON CONFLICT (id) DO NOTHING;

-- 2. Clientes demo
INSERT INTO public.clients (id, user_id, first_name, last_name, phone, email, notes) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Ana', 'García', '809-555-0101', 'ana@example.com', 'Boda en junio 2026'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Pedro', 'Martínez', '809-555-0102', 'pedro@example.com', 'Sesión de retratos familiar'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
   'Laura', 'Rodríguez', '849-555-0103', 'laura@example.com', 'Quinceañera en agosto'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
   'Miguel', 'Pérez', '829-555-0104', 'miguel@example.com', 'Bautizo'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003',
   'Sofía', 'López', '809-555-0105', 'sofia@example.com', 'Sesión de maternidad')
ON CONFLICT (id) DO NOTHING;

-- 3. Settings
INSERT INTO public.settings (key, value) VALUES
  ('studio_name', 'KuanticMedia Studio'),
  ('studio_phone', '809-555-0000'),
  ('studio_email', 'hola@kuanticmedia.com'),
  ('currency', 'DOP'),
  ('whatsapp_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 4. Citas
INSERT INTO public.appointments (id, client_id, date, time, session_type, status, notes) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   '2026-07-15', '10:00', 'Pre-boda', 'confirmada', 'Llegar 15 min antes'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   '2026-08-20', '14:00', 'Quinceañera', 'pendiente', 'Llevar vestido de repuesto')
ON CONFLICT (id) DO NOTHING;

-- 5. Proyectos
INSERT INTO public.projects (id, client_id, appointment_id, name, status, delivery_date) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'Boda Ana & Carlos', 'seleccion', '2026-07-30'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000002', 'Quinceañera Laura', 'pendiente', '2026-09-15'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
   NULL, 'Retratos Familia Martínez', 'edicion', '2026-06-28')
ON CONFLICT (id) DO NOTHING;

-- 6. Pagos
INSERT INTO public.payments (id, client_id, project_id, amount, status, payment_method) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000001', 25000.00, 'parcial', 'transferencia'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'd0000000-0000-0000-0000-000000000002', 35000.00, 'pendiente', NULL),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000003', 8000.00, 'pagado', 'efectivo')
ON CONFLICT (id) DO NOTHING;

-- 7. Galerías
INSERT INTO public.galleries (id, client_id, project_id, title, status, share_token) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000001', 'Pre-boda Ana & Carlos', 'draft', 'token-pre-boda-001'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000003', 'Retratos Familia', 'active', 'token-retratos-002'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005',
   NULL, 'Maternidad Sofía', 'active', 'token-mater-003')
ON CONFLICT (id) DO NOTHING;

-- 8. Fotos demo
INSERT INTO public.gallery_photos (id, gallery_id, url, filename) VALUES
  ('70000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
   'https://picsum.photos/seed/pre1/800/600', 'preboda-01.jpg'),
  ('70000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001',
   'https://picsum.photos/seed/pre2/800/600', 'preboda-02.jpg'),
  ('70000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002',
   'https://picsum.photos/seed/ret1/800/600', 'retrato-01.jpg'),
  ('70000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002',
   'https://picsum.photos/seed/ret2/800/600', 'retrato-02.jpg'),
  ('70000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000003',
   'https://picsum.photos/seed/mat1/800/600', 'mater-01.jpg')
ON CONFLICT (id) DO NOTHING;

-- 9. Mensajes WhatsApp
INSERT INTO public.whatsapp_messages (id, client_id, phone, direction, message) VALUES
  ('a7000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   '809-555-0101', 'entrante', 'Hola! Quisiera saber el estado de mi galería de la pre-boda'),
  ('a7000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   '809-555-0101', 'saliente', '¡Hola Ana! Ya estamos editando las fotos. Esta semana las tendrás listas 🎉'),
  ('a7000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   '849-555-0103', 'entrante', 'Buenos días, ¿tienen disponibilidad para el 20 de agosto?')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════
-- CONFIRMACIÓN
-- ═══════════════════════════════════
SELECT '✅ PhotoCRM setup completado' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
