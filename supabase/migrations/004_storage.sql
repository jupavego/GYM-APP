-- ============================================================
-- 004_storage.sql
-- Buckets de Storage y sus políticas
-- Ejecutar después de 003_rls_policies.sql
-- ============================================================

-- ── Crear buckets ────────────────────────────────────────────
-- avatars: fotos de perfil de usuarios
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- accounts: logos y portadas de cuentas/negocios
INSERT INTO storage.buckets (id, name, public)
VALUES ('accounts', 'accounts', TRUE)
ON CONFLICT (id) DO NOTHING;

-- SEC-010 | OWASP A05:2021 — Security Misconfiguration
-- La validación de tamaño/tipo del cliente (storage.service.ts) es
-- solo del navegador — una llamada directa a la Storage API la evade
-- por completo. Esto usa el enforcement nativo de Supabase Storage,
-- que la Storage API aplica antes de tocar RLS y no se puede saltar.
UPDATE storage.buckets
SET
  file_size_limit   = 5242880,  -- 5 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('avatars', 'accounts');

-- ── Limpiar políticas anteriores ────────────────────────────
DROP POLICY IF EXISTS "avatars_select_public"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"     ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"     ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"     ON storage.objects;
DROP POLICY IF EXISTS "accounts_select_public" ON storage.objects;
DROP POLICY IF EXISTS "accounts_insert_own"    ON storage.objects;
DROP POLICY IF EXISTS "accounts_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "accounts_delete_own"    ON storage.objects;

-- ════════════════════════════════════════════════════════════
-- BUCKET: avatars — path: {userId}/avatar.jpg
-- ════════════════════════════════════════════════════════════

CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

-- ════════════════════════════════════════════════════════════
-- BUCKET: accounts — path: {userId}/logo.jpg | {userId}/cover.jpg
-- ════════════════════════════════════════════════════════════

CREATE POLICY "accounts_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'accounts');

CREATE POLICY "accounts_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'accounts'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "accounts_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'accounts'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "accounts_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'accounts'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);
