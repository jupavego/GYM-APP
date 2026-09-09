-- ============================================================
-- seed-templates.sql
-- Plantillas base de rutina — bloques por body_part, no ejercicios
-- fijos (el plan-generator.service.ts los resuelve contra la
-- biblioteca de ejercicios disponible al generar el plan).
--
-- body_part usa el mismo catálogo del dataset de ejercicios:
-- back, cardio, chest, lower arms, lower legs, neck, shoulders,
-- upper arms, upper legs, waist.
--
-- Ejecutar después de 007_fitness_engine.sql (y seed-exercises.sql,
-- aunque no hay FK directa — solo por orden lógico).
-- ============================================================

INSERT INTO public.workout_template (code, name, days_per_week, target_experience, target_goal, structure)
VALUES
  (
    'TPL_FULL_BODY_2D',
    'Cuerpo completo — 2 días',
    2, 'beginner', 'fitness',
    '{"days":[
      {"day":"A","label":"Full Body A","blocks":[{"body_part":"upper legs","count":2},{"body_part":"chest","count":1},{"body_part":"back","count":1},{"body_part":"waist","count":1}]},
      {"day":"B","label":"Full Body B","blocks":[{"body_part":"upper legs","count":2},{"body_part":"shoulders","count":1},{"body_part":"back","count":1},{"body_part":"waist","count":1}]}
    ]}'::jsonb
  ),
  (
    'TPL_FULL_BODY_3D',
    'Cuerpo completo — 3 días',
    3, 'beginner', 'hypertrophy',
    '{"days":[
      {"day":"A","label":"Full Body A","blocks":[{"body_part":"chest","count":2},{"body_part":"back","count":2},{"body_part":"upper legs","count":2},{"body_part":"waist","count":1}]},
      {"day":"B","label":"Full Body B","blocks":[{"body_part":"shoulders","count":2},{"body_part":"upper arms","count":2},{"body_part":"upper legs","count":2},{"body_part":"waist","count":1}]},
      {"day":"C","label":"Full Body C","blocks":[{"body_part":"chest","count":1},{"body_part":"back","count":1},{"body_part":"upper legs","count":2},{"body_part":"lower legs","count":1},{"body_part":"waist","count":1}]}
    ]}'::jsonb
  ),
  (
    'TPL_UPPER_LOWER_4D',
    'Torso / pierna — 4 días',
    4, 'intermediate', 'hypertrophy',
    '{"days":[
      {"day":"A","label":"Torso A","blocks":[{"body_part":"chest","count":2},{"body_part":"back","count":2},{"body_part":"shoulders","count":1},{"body_part":"upper arms","count":2}]},
      {"day":"B","label":"Pierna A","blocks":[{"body_part":"upper legs","count":3},{"body_part":"lower legs","count":1},{"body_part":"waist","count":1}]},
      {"day":"C","label":"Torso B","blocks":[{"body_part":"back","count":2},{"body_part":"chest","count":2},{"body_part":"shoulders","count":1},{"body_part":"upper arms","count":2}]},
      {"day":"D","label":"Pierna B","blocks":[{"body_part":"upper legs","count":3},{"body_part":"lower legs","count":1},{"body_part":"waist","count":1}]}
    ]}'::jsonb
  ),
  (
    'TPL_PUSH_PULL_LEGS_5D',
    'Push / Pull / Legs — 5 días',
    5, 'intermediate', 'hypertrophy',
    '{"days":[
      {"day":"A","label":"Push","blocks":[{"body_part":"chest","count":2},{"body_part":"shoulders","count":2},{"body_part":"upper arms","count":1}]},
      {"day":"B","label":"Pull","blocks":[{"body_part":"back","count":3},{"body_part":"upper arms","count":1}]},
      {"day":"C","label":"Legs","blocks":[{"body_part":"upper legs","count":3},{"body_part":"lower legs","count":1},{"body_part":"waist","count":1}]},
      {"day":"D","label":"Push","blocks":[{"body_part":"chest","count":2},{"body_part":"shoulders","count":1},{"body_part":"upper arms","count":2}]},
      {"day":"E","label":"Pull","blocks":[{"body_part":"back","count":2},{"body_part":"upper arms","count":1},{"body_part":"waist","count":1}]}
    ]}'::jsonb
  ),
  (
    'TPL_FULL_BODY_STRENGTH_3D',
    'Fuerza cuerpo completo — 3 días',
    3, 'advanced', 'strength',
    '{"days":[
      {"day":"A","label":"Fuerza A","blocks":[{"body_part":"upper legs","count":1},{"body_part":"chest","count":1},{"body_part":"back","count":1}]},
      {"day":"B","label":"Fuerza B","blocks":[{"body_part":"upper legs","count":1},{"body_part":"shoulders","count":1},{"body_part":"back","count":1}]},
      {"day":"C","label":"Fuerza C","blocks":[{"body_part":"upper legs","count":1},{"body_part":"chest","count":1},{"body_part":"upper arms","count":1}]}
    ]}'::jsonb
  )
ON CONFLICT (code) DO NOTHING;
