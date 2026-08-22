-- ============================================================
-- 003_rls_policies.sql
-- Row Level Security — profiles y accounts
-- Ejecutar en: Supabase Dashboard → SQL Editor, después de 002
-- ============================================================

-- ── Habilitar RLS ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- ── Limpiar policies existentes (idempotente) ────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'accounts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- TABLA: profiles
-- ============================================================

-- SELECT: cada usuario ve solo su propio perfil. El admin ve todos.
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
);

-- INSERT: Supabase crea el perfil automáticamente vía trigger.
-- Solo el propio usuario puede insertarlo (caso manual).
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: cada usuario actualiza solo su perfil.
-- El admin puede actualizar cualquiera (para cambiar rol).
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
)
WITH CHECK (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
);

-- DELETE: nadie puede borrar perfiles desde el cliente.

-- ============================================================
-- TABLA: accounts
-- ============================================================

-- SELECT público: cualquiera ve cuentas aprobadas y activas.
-- El dueño y el admin ven la cuenta sin importar su estado.
CREATE POLICY "accounts_select_public"
ON accounts FOR SELECT
USING (
  (active = true AND status = 'approved')
  OR auth.uid() = owner_id
  OR public.get_my_role() = 'admin'
);

-- INSERT: solo usuarios con rol 'business' pueden crear su cuenta.
CREATE POLICY "accounts_insert_business"
ON accounts FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  AND public.get_my_role() = 'business'
);

-- UPDATE: el dueño edita su propia cuenta.
-- El admin puede cambiar status/active (aprobación/rechazo).
CREATE POLICY "accounts_update_owner"
ON accounts FOR UPDATE
USING (
  auth.uid() = owner_id
  OR public.get_my_role() = 'admin'
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.get_my_role() = 'admin'
);

-- DELETE: solo admin (ej: suspender definitivamente).
CREATE POLICY "accounts_delete_admin"
ON accounts FOR DELETE
USING (public.get_my_role() = 'admin');

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'accounts')
ORDER BY tablename, cmd;
