-- ═══════════════════════════════════════════════════════════════
-- Travel Kit — esquema de base de datos para Neon (PostgreSQL)
-- Reconstruido a partir del uso que hace la app de cada tabla.
-- Es idempotente: se puede ejecutar más de una vez sin romper nada.
-- Aplicar con:  npm run db:setup
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Clientes y accesos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text DEFAULT '',
  phone       text DEFAULT '',
  source      text DEFAULT 'manual',          -- manual | agenda | agenda_session_only
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Perfil de acceso al portal: comparte el id con el cliente
CREATE TABLE IF NOT EXISTS client_profiles (
  id                 uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  email              text UNIQUE,
  role               text DEFAULT 'cliente',
  temp_password_set  boolean DEFAULT false,
  last_login         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Estado de cuenta / datos del viaje en curso (uno por cliente)
CREATE TABLE IF NOT EXISTS client_billing (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  tasks                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes                  text DEFAULT '[]',
  destination            text,
  origin                 text,
  passengers             integer DEFAULT 1,
  departure_date         text,
  departure_time         text,
  arrival_date           text,
  arrival_time           text,
  return_date            text,
  return_departure_time  text,
  return_arrival_date    text,
  return_arrival_time    text,
  return_origin          text,
  return_destination     text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE,
  rating       integer NOT NULL DEFAULT 5,
  comment      text,
  destination  text,
  pax          integer DEFAULT 1,
  is_public    boolean DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS travel_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE,
  trip_name       text,
  destination     text,
  start_date      text,
  end_date        text,
  itinerary_data  jsonb DEFAULT '[]'::jsonb,
  billing_data    jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Agenda y consultas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_meetings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name      text,
  destination      text,
  email            text,
  phone            text,
  meeting_date     text,                       -- yyyy-MM-dd
  meeting_time     text,                       -- HH:mm
  status           text DEFAULT 'confirmed',   -- confirmed | cancelled | completed | client_saved | client_rejected
  google_meet_url  text,
  advance_paid     boolean DEFAULT false,
  final_paid       boolean DEFAULT false,
  paid_amount      numeric,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_questions (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- las base usan 'base-1', 'base-2', ...
  text        text NOT NULL,
  type        text DEFAULT 'textarea',
  required    boolean DEFAULT false,
  is_base     boolean DEFAULT false,
  options     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text,
  email           text,
  phone           text,
  requested_date  text,
  requested_time  text,
  status          text DEFAULT 'nuevo',
  answers         jsonb DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS viaje_ideal_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text        text NOT NULL,
  options     jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS viaje_ideal_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name  text,
  answers      jsonb DEFAULT '[]'::jsonb,
  result       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Catálogo (hoteles, transportes, excursiones) ─────────────
CREATE TABLE IF NOT EXISTS catalog_folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL,                   -- hotel | transport | excursion
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id       uuid REFERENCES catalog_folders(id) ON DELETE CASCADE,
  name            text NOT NULL,
  cost_usd        numeric DEFAULT 0,
  location        text,
  description     text,
  links           jsonb DEFAULT '[]'::jsonb,
  notes           text,
  capacity        integer,
  -- excursiones
  pricing_type    text,
  -- hoteles
  nights          integer,
  stars           integer,
  breakfast       boolean DEFAULT false,
  half_board      boolean DEFAULT false,
  all_inclusive   boolean DEFAULT false,
  extra_services  text,
  -- transportes
  origin          text,
  destination     text,
  company         text,
  driver_name     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid REFERENCES clients(id) ON DELETE CASCADE,
  type              text,                       -- hotel | transport | excursion
  item_id           uuid REFERENCES catalog_items(id) ON DELETE SET NULL,
  name              text,
  date              text,
  time              text,
  end_date          text,
  end_time          text,
  origin            text,
  destination       text,
  address           text,
  reservation_code  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid REFERENCES clients(id) ON DELETE CASCADE,
  passenger_count    integer DEFAULT 1,
  amount             numeric DEFAULT 0,
  source             text,
  file_url           text,
  notes              text,
  is_same_price      boolean DEFAULT true,
  passengers_detail  jsonb DEFAULT '[]'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  price       numeric NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Sitio, campañas y sistema ────────────────────────────────
CREATE TABLE IF NOT EXISTS client_destinations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  image_url    text,
  images       jsonb DEFAULT '[]'::jsonb,
  is_active    boolean DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  subject     text,
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  subject     text,
  body        text,
  cron_type   text,
  active      boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp  timestamptz NOT NULL DEFAULT now(),
  level      text,
  category   text,
  message    text,
  details    jsonb
);

-- Archivos subidos (fotos de destinos, PDFs de pasajes). Reemplaza al storage de Supabase.
CREATE TABLE IF NOT EXISTS stored_files (
  key           text PRIMARY KEY,               -- "<bucket>/<ruta>"
  content_type  text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes    integer,
  data          bytea NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Índices para las consultas frecuentes ────────────────────
CREATE INDEX IF NOT EXISTS idx_scheduled_items_client ON scheduled_items(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_folder ON catalog_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_travel_history_client ON travel_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_client ON client_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
