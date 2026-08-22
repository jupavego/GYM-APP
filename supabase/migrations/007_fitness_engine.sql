-- ============================================================
-- 007_fitness_engine.sql
-- Motor de recomendación de rutinas — MVP (7 tablas)
-- Ejecutar después de 006_memberships.sql
-- ============================================================
--
-- Pipeline: fitness_profile → (template-matcher) → workout_template
--           → workout_plan + plan_session → checkin → plan_adjustment
--
-- Los "derivados" (IMC, etc.) se calculan en el servicio, no se
-- almacenan. El motor de reglas vive en TypeScript, no en tabla —
-- ver core/services/fitness/ en el frontend.
--
-- Por ahora sin restricción por membresía activa — cualquier
-- usuario autenticado puede usar el módulo (fase de pruebas).
-- ============================================================

-- ── fitness_profile ──────────────────────────────────────────
-- Cuestionario del cliente. Una fila por cliente (se sobrescribe
-- al re-tomar el cuestionario — no es historial, es "el perfil actual").
CREATE TABLE IF NOT EXISTS public.fitness_profile (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id          UUID        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  age                INT         NOT NULL CHECK (age BETWEEN 12 AND 100),
  sex                TEXT        NOT NULL CHECK (sex IN ('male', 'female', 'other')),
  weight_kg          NUMERIC(5,2) NOT NULL,
  height_cm          NUMERIC(5,2) NOT NULL,
  goal_primary       TEXT        NOT NULL CHECK (goal_primary IN ('hypertrophy', 'strength', 'fat_loss', 'fitness', 'functional', 'maintenance')),
  goal_secondary     TEXT        CHECK (goal_secondary IN ('hypertrophy', 'strength', 'fat_loss', 'fitness', 'functional', 'maintenance')),
  experience_level   TEXT        NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  days_available     INT         NOT NULL CHECK (days_available BETWEEN 1 AND 7),
  session_duration_min INT       NOT NULL CHECK (session_duration_min BETWEEN 15 AND 180),
  horizon            TEXT        NOT NULL CHECK (horizon IN ('short', 'medium', 'long')),
  time_preference    TEXT        NOT NULL CHECK (time_preference IN ('morning', 'afternoon', 'evening', 'flexible')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── exercise ──────────────────────────────────────────────────
-- Biblioteca de ejercicios, sembrada desde exercises-dataset (MIT,
-- atribución obligatoria en imágenes/GIFs — ver supabase/README.md).
CREATE TABLE IF NOT EXISTS public.exercise (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id        TEXT        UNIQUE,
  name               TEXT        NOT NULL,
  body_part          TEXT        NOT NULL,
  equipment          TEXT        NOT NULL,
  muscle_group       TEXT        NOT NULL,
  secondary_muscles  TEXT[]      NOT NULL DEFAULT '{}',
  movement_pattern   TEXT,       -- nullable — no viene en el dataset fuente, se enriquece después
  level              TEXT,       -- nullable — idem
  instructions_es    TEXT,
  image_url          TEXT,
  gif_url            TEXT,
  attribution        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_body_part ON public.exercise(body_part);
CREATE INDEX IF NOT EXISTS idx_exercise_equipment ON public.exercise(equipment);

-- ── workout_template ──────────────────────────────────────────
-- Agendas predefinidas por bloque de body_part, no ejercicios fijos.
-- structure ej: {"days":[{"day":"A","label":"Full Body A","blocks":[{"body_part":"chest","count":2}, ...]}]}
CREATE TABLE IF NOT EXISTS public.workout_template (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT        NOT NULL UNIQUE,
  name              TEXT        NOT NULL,
  days_per_week     INT         NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  target_experience TEXT        NOT NULL CHECK (target_experience IN ('beginner', 'intermediate', 'advanced')),
  target_goal       TEXT        NOT NULL CHECK (target_goal IN ('hypertrophy', 'strength', 'fat_loss', 'fitness', 'functional', 'maintenance')),
  structure         JSONB       NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── workout_plan ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_plan (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id   UUID        NOT NULL REFERENCES public.workout_template(id),
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  horizon_weeks INT         NOT NULL DEFAULT 4,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_plan_client_id ON public.workout_plan(client_id);

-- ── plan_session ──────────────────────────────────────────────
-- exercises ej: [{"exercise_id":"...","sets":3,"reps":10,"rest_sec":60}, ...]
CREATE TABLE IF NOT EXISTS public.plan_session (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id    UUID        NOT NULL REFERENCES public.workout_plan(id) ON DELETE CASCADE,
  day_label  TEXT        NOT NULL,
  day_index  INT         NOT NULL,
  exercises  JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_session_plan_id ON public.plan_session(plan_id);

-- ── checkin ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkin (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id        UUID        NOT NULL REFERENCES public.workout_plan(id) ON DELETE CASCADE,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  q_adherence    INT         NOT NULL CHECK (q_adherence BETWEEN 1 AND 5),
  q_energy       INT         NOT NULL CHECK (q_energy BETWEEN 1 AND 5),
  q_difficulty   INT         NOT NULL CHECK (q_difficulty BETWEEN 1 AND 5),
  q_pain         TEXT        NOT NULL CHECK (q_pain IN ('none', 'mild', 'moderate', 'severe')),
  q_progress     INT         NOT NULL CHECK (q_progress BETWEEN 1 AND 5),
  q_days_actual  INT         NOT NULL CHECK (q_days_actual BETWEEN 0 AND 7),
  q_preference   TEXT        NOT NULL CHECK (q_preference IN ('keep', 'tweak', 'change'))
);

CREATE INDEX IF NOT EXISTS idx_checkin_client_id ON public.checkin(client_id);

-- ── plan_adjustment ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_adjustment (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id   UUID        NOT NULL REFERENCES public.checkin(id) ON DELETE CASCADE,
  plan_id      UUID        NOT NULL REFERENCES public.workout_plan(id) ON DELETE CASCADE,
  signals      TEXT[]      NOT NULL DEFAULT '{}',
  action_taken TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.fitness_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_session     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_adjustment  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('fitness_profile', 'exercise', 'workout_template', 'workout_plan', 'plan_session', 'checkin', 'plan_adjustment')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- fitness_profile — el cliente gestiona el suyo, admin ve todos
CREATE POLICY "fitness_profile_select_own" ON fitness_profile FOR SELECT
USING (client_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "fitness_profile_insert_own" ON fitness_profile FOR INSERT
WITH CHECK (client_id = auth.uid());
CREATE POLICY "fitness_profile_update_own" ON fitness_profile FOR UPDATE
USING (client_id = auth.uid() OR public.get_my_role() = 'admin')
WITH CHECK (client_id = auth.uid() OR public.get_my_role() = 'admin');

-- exercise — catálogo de lectura pública (autenticado), solo admin escribe
CREATE POLICY "exercise_select_all" ON exercise FOR SELECT
USING (auth.uid() IS NOT NULL);
CREATE POLICY "exercise_write_admin" ON exercise FOR ALL
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- workout_template — igual que exercise
CREATE POLICY "workout_template_select_all" ON workout_template FOR SELECT
USING (auth.uid() IS NOT NULL);
CREATE POLICY "workout_template_write_admin" ON workout_template FOR ALL
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- workout_plan — el cliente ve/crea los suyos, admin todos
CREATE POLICY "workout_plan_select_own" ON workout_plan FOR SELECT
USING (client_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "workout_plan_insert_own" ON workout_plan FOR INSERT
WITH CHECK (client_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "workout_plan_update_own" ON workout_plan FOR UPDATE
USING (client_id = auth.uid() OR public.get_my_role() = 'admin')
WITH CHECK (client_id = auth.uid() OR public.get_my_role() = 'admin');

-- plan_session — vía el plan al que pertenece
CREATE POLICY "plan_session_select_own" ON plan_session FOR SELECT
USING (
  EXISTS (SELECT 1 FROM workout_plan wp WHERE wp.id = plan_session.plan_id AND wp.client_id = auth.uid())
  OR public.get_my_role() = 'admin'
);
CREATE POLICY "plan_session_insert_own" ON plan_session FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM workout_plan wp WHERE wp.id = plan_session.plan_id AND wp.client_id = auth.uid())
  OR public.get_my_role() = 'admin'
);

-- checkin — el cliente gestiona los suyos, admin todos
CREATE POLICY "checkin_select_own" ON checkin FOR SELECT
USING (client_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "checkin_insert_own" ON checkin FOR INSERT
WITH CHECK (client_id = auth.uid() OR public.get_my_role() = 'admin');

-- plan_adjustment — vía el checkin al que pertenece
CREATE POLICY "plan_adjustment_select_own" ON plan_adjustment FOR SELECT
USING (
  EXISTS (SELECT 1 FROM checkin c WHERE c.id = plan_adjustment.checkin_id AND c.client_id = auth.uid())
  OR public.get_my_role() = 'admin'
);
CREATE POLICY "plan_adjustment_insert_own" ON plan_adjustment FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM checkin c WHERE c.id = plan_adjustment.checkin_id AND c.client_id = auth.uid())
  OR public.get_my_role() = 'admin'
);
