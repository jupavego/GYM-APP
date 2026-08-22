-- ============================================================
-- 005_stats_function.sql
-- Función SQL para estadísticas del panel admin
-- Ejecutar en Supabase SQL Editor
-- ============================================================
--
-- Hace los conteos directamente en PostgreSQL y devuelve un
-- solo JSON — una sola round-trip sin importar cuántos usuarios
-- o cuentas haya.
--
-- SECURITY DEFINER bypasea RLS, así que la función debe validar
-- el rol ella misma — sin este check cualquier usuario autenticado
-- podría llamarla vía rpc('get_admin_stats').
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN (
    SELECT json_build_object(
      'totalUsers',       COUNT(*)                                       FILTER (WHERE role IS NOT NULL),
      'totalBusinesses',  COUNT(*)                                       FILTER (WHERE role = 'business'),
      'totalClients',     COUNT(*)                                       FILTER (WHERE role = 'client'),
      'totalAccounts',    (SELECT COUNT(*) FROM public.accounts),
      'pendingAccounts',  (SELECT COUNT(*) FROM public.accounts WHERE status = 'pending'),
      'approvedAccounts', (SELECT COUNT(*) FROM public.accounts WHERE status = 'approved')
    )
    FROM public.profiles
  );
END;
$$;
