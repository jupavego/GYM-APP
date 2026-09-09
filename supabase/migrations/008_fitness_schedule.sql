-- ============================================================
-- 008_fitness_schedule.sql
-- Días de la semana preferidos por el cliente — usados para
-- calcular el cronograma del plan (no se almacena el calendario,
-- se deriva en el servicio a partir de esta columna + start_date +
-- horizon_weeks del workout_plan).
-- ============================================================

ALTER TABLE public.fitness_profile
  ADD COLUMN IF NOT EXISTS preferred_weekdays INT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.fitness_profile.preferred_weekdays IS
  'Días de la semana en los que el cliente puede entrenar. 0=lunes .. 6=domingo (ISO). La cantidad debe coincidir con days_available — validado en el frontend.';
