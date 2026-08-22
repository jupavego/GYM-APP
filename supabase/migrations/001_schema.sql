-- ============================================================
-- 001_schema.sql
-- Schema base de la plantilla — perfiles y cuentas por rol
-- Ejecutar primero, antes que cualquier otro migration
-- ============================================================

-- ── Extensiones necesarias ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tipos enumerados ─────────────────────────────────────────
-- Rol de usuario dentro del sistema. Ajusta los valores si tu
-- proyecto necesita otros roles (ej. 'operator' en vez de 'business').
CREATE TYPE user_role AS ENUM ('client', 'business', 'admin');

-- Estado del ciclo de vida de una cuenta (negocio/organización)
CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- ── Tabla: profiles ──────────────────────────────────────────
-- Extiende auth.users de Supabase con datos del perfil de usuario.
-- Se crea automáticamente vía trigger cuando se registra un usuario
-- (ver 002_auth_triggers.sql).
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'client',
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: accounts ──────────────────────────────────────────
-- Ficha de la cuenta/organización asociada a un usuario 'business'.
-- Patrón genérico 1:1 perfil → cuenta, reutilizable para cualquier
-- app donde un usuario "operador" administre una entidad propia
-- (negocio, consultorio, sede, proyecto, etc).
CREATE TABLE IF NOT EXISTS public.accounts (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT          NOT NULL,
  description TEXT,
  slogan      TEXT,
  history     TEXT,
  address     TEXT,
  zone        TEXT,
  phone       TEXT,
  schedule    TEXT,
  category    TEXT,
  logo_url    TEXT,
  cover_url   TEXT,
  facebook    TEXT,
  instagram   TEXT,
  whatsapp    TEXT,
  active      BOOLEAN       NOT NULL DEFAULT FALSE,
  status      account_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Un usuario business solo puede tener una cuenta
  CONSTRAINT accounts_owner_unique UNIQUE (owner_id)
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON public.accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status   ON public.accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_category ON public.accounts(category);

-- ── Función helper: obtener rol del JWT ──────────────────────
-- Evita consultar la tabla profiles dentro de políticas RLS
-- previniendo recursión infinita.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'role',
    (auth.jwt() ->> 'role')
  );
$$;
