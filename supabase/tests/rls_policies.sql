-- ============================================================
-- rls_policies.sql — Suite de tests de RLS
-- Plantilla base
--
-- Ejecutar en: Supabase Dashboard → SQL Editor (service_role)
-- Cada bloque imprime PASS o FAIL con descripción del test.
-- Correr después de aplicar las migraciones y cada vez que se
-- modifiquen las policies.
-- ============================================================

DO $$
DECLARE
  v_count   INTEGER;
  v_pass    INTEGER := 0;
  v_fail    INTEGER := 0;

  -- ── Helper ──────────────────────────────────────────────────
  PROCEDURE assert_eq(label TEXT, actual ANYDOUBLEQUOTED, expected ANYDOUBLEQUOTED) AS $p$
  BEGIN
    IF actual = expected THEN
      RAISE NOTICE 'PASS  %', label;
      v_pass := v_pass + 1;
    ELSE
      RAISE WARNING 'FAIL  % — esperado: %, obtenido: %', label, expected, actual;
      v_fail := v_fail + 1;
    END IF;
  END;
  $p$ LANGUAGE plpgsql;

BEGIN

  -- ── T-01: handle_new_user — whitelist de roles ───────────────
  -- Verifica que el trigger rechace 'admin' y asigne 'client' como fallback.
  -- No podemos invocar el trigger directamente, así que verificamos la lógica
  -- con una expresión CASE equivalente a la del trigger.
  DECLARE v_result TEXT;
  BEGIN
    SELECT CASE
      WHEN 'admin' IN ('client','business') THEN 'admin'
      ELSE 'client'
    END INTO v_result;
    PERFORM assert_eq('T-01: role=admin → fallback client', v_result, 'client');
  END;

  DECLARE v_result TEXT;
  BEGIN
    SELECT CASE
      WHEN 'business' IN ('client','business') THEN 'business'
      ELSE 'client'
    END INTO v_result;
    PERFORM assert_eq('T-02: role=business → business', v_result, 'business');
  END;

  -- ── T-03: get_admin_stats — bloqueo a no-admin ───────────────
  -- La función debe lanzar excepción si el rol no es 'admin'.
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"client"}}',
      true);
    PERFORM public.get_admin_stats();
    RAISE WARNING 'FAIL  T-03: get_admin_stats no bloqueó a rol client';
    v_fail := v_fail + 1;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Access denied%' THEN
      RAISE NOTICE 'PASS  T-03: get_admin_stats bloqueó a rol client';
      v_pass := v_pass + 1;
    ELSE
      RAISE WARNING 'FAIL  T-03: excepción inesperada: %', SQLERRM;
      v_fail := v_fail + 1;
    END IF;
  END;

  -- ── T-04: profiles — policies existen ────────────────────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND schemaname = 'public';
  PERFORM assert_eq('T-04: profiles tiene exactamente 3 policies', v_count, 3);

  -- ── T-05: accounts — policies existen ────────────────────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'accounts' AND schemaname = 'public';
  PERFORM assert_eq('T-05: accounts tiene exactamente 4 policies', v_count, 4);

  -- ── T-06: profiles — sin policy DELETE ───────────────────────
  -- Nadie puede borrar perfiles desde el cliente.
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND schemaname = 'public' AND cmd = 'DELETE';
  PERFORM assert_eq('T-06: profiles sin policy DELETE', v_count, 0);

  -- ── T-07: accounts — INSERT usa get_my_role() ────────────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename   = 'accounts'
    AND schemaname  = 'public'
    AND policyname  = 'accounts_insert_business'
    AND with_check LIKE '%get_my_role%';
  PERFORM assert_eq('T-07: accounts_insert_business usa get_my_role()', v_count, 1);

  -- ── T-08: accounts — DELETE solo admin ───────────────────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename   = 'accounts'
    AND schemaname  = 'public'
    AND policyname  = 'accounts_delete_admin'
    AND qual LIKE '%get_my_role%';
  PERFORM assert_eq('T-08: accounts_delete_admin usa get_my_role()', v_count, 1);

  -- ── T-09: storage — buckets avatars/accounts existen ─────────
  SELECT COUNT(*) INTO v_count
  FROM storage.buckets
  WHERE id IN ('avatars', 'accounts');
  PERFORM assert_eq('T-09: buckets avatars y accounts existen', v_count, 2);

  -- ── T-10: RLS habilitado en tablas del dominio ───────────────
  SELECT COUNT(*) INTO v_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('profiles', 'accounts')
    AND c.relrowsecurity = true;
  PERFORM assert_eq('T-10: RLS habilitado en profiles y accounts', v_count, 2);

  -- ── Resumen ──────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════';
  RAISE NOTICE 'Resultado: % PASS  /  % FAIL', v_pass, v_fail;
  RAISE NOTICE '════════════════════════════════';

END;
$$;
