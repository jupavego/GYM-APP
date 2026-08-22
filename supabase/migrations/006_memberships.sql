-- ============================================================
-- 006_memberships.sql
-- Membresías/licencias de clientes — activación manual por admin
-- Ejecutar después de 003_rls_policies.sql
-- ============================================================
--
-- Cada activación (o renovación) inserta una fila nueva en vez de
-- sobrescribir — así queda historial gratis. El estado "actual" de
-- un cliente es su fila con expires_at más reciente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memberships (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id      TEXT        NOT NULL CHECK (plan_id IN ('mensual', 'trimestral', 'semestral', 'anual')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  activated_by UUID        REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_client_id  ON public.memberships(client_id);
CREATE INDEX IF NOT EXISTS idx_memberships_expires_at ON public.memberships(expires_at);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'memberships'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON memberships', pol.policyname);
  END LOOP;
END $$;

-- SELECT: el cliente ve solo sus propias membresías, el admin ve todas
CREATE POLICY "memberships_select_own"
ON memberships FOR SELECT
USING (
  client_id = auth.uid()
  OR public.get_my_role() = 'admin'
);

-- INSERT: solo admin activa/renueva membresías
CREATE POLICY "memberships_insert_admin"
ON memberships FOR INSERT
WITH CHECK (public.get_my_role() = 'admin');

-- Sin UPDATE ni DELETE — una reactivación es una fila nueva, no una edición.
