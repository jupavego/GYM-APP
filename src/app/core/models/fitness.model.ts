// fitness.model.ts
// Motor de recomendación de rutinas — modelos MVP.
// Pipeline: fitness_profile → template-matcher → workout_template
//           → workout_plan + plan_session → checkin → plan_adjustment
// Ver supabase/migrations/007_fitness_engine.sql para el esquema completo.

export type Sex             = 'male' | 'female' | 'other';
export type Goal            = 'hypertrophy' | 'strength' | 'fat_loss' | 'fitness' | 'functional' | 'maintenance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Horizon         = 'short' | 'medium' | 'long';
export type TimePreference  = 'morning' | 'afternoon' | 'evening' | 'flexible';

export const GOAL_LABELS: Record<Goal, string> = {
  hypertrophy: 'Ganar masa muscular',
  strength:    'Ganar fuerza',
  fat_loss:    'Perder grasa',
  fitness:     'Acondicionamiento general',
  functional:  'Funcionalidad / movilidad',
  maintenance: 'Mantenimiento',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
};

// 0=lunes..6=domingo (ISO) — mismo orden que preferred_weekdays
export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const WEEKDAY_LABELS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// body_part del dataset de ejercicios → ícono a usar en la UI (@switch en plan-view).
export type BodyPartIcon = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'neck';

export const BODY_PART_ICON: Record<string, BodyPartIcon> = {
  chest:        'chest',
  back:         'back',
  'upper legs': 'legs',
  'lower legs': 'legs',
  shoulders:    'shoulders',
  'upper arms': 'arms',
  'lower arms': 'arms',
  waist:        'core',
  cardio:       'cardio',
  neck:         'neck',
};

export interface FitnessProfile {
  id: string;
  client_id: string;
  age: number;
  sex: Sex;
  weight_kg: number;
  height_cm: number;
  goal_primary: Goal;
  goal_secondary: Goal | null;
  experience_level: ExperienceLevel;
  days_available: number;
  preferred_weekdays: number[]; // 0=lunes..6=domingo (ISO), length === days_available
  session_duration_min: number;
  horizon: Horizon;
  time_preference: TimePreference;
  updated_at: string;
}

export type FitnessProfileInput = Omit<FitnessProfile, 'id' | 'client_id' | 'updated_at'>;

export interface Exercise {
  id: string;
  external_id: string | null;
  name: string;
  body_part: string;
  equipment: string;
  muscle_group: string;
  secondary_muscles: string[];
  movement_pattern: string | null;
  level: string | null;
  instructions_es: string | null;
  image_url: string | null;
  gif_url: string | null;
  attribution: string | null;
}

export interface TemplateBlock {
  body_part: string;
  count: number;
}

export interface TemplateDay {
  day: string;
  label: string;
  blocks: TemplateBlock[];
}

export interface TemplateStructure {
  days: TemplateDay[];
}

export interface WorkoutTemplate {
  id: string;
  code: string;
  name: string;
  days_per_week: number;
  target_experience: ExperienceLevel;
  target_goal: Goal;
  structure: TemplateStructure;
}

export type PlanStatus = 'active' | 'completed' | 'cancelled';

export interface WorkoutPlan {
  id: string;
  client_id: string;
  template_id: string;
  status: PlanStatus;
  start_date: string;
  horizon_weeks: number;
  generated_at: string;
}

export interface PlanExerciseEntry {
  exercise_id: string;
  sets: number;
  reps: number;
  rest_sec: number;
}

export interface PlanSession {
  id: string;
  plan_id: string;
  day_label: string;
  day_index: number;
  exercises: PlanExerciseEntry[];
}

// Cronograma — calculado en el servicio a partir de start_date +
// horizon_weeks + preferred_weekdays, no se almacena en DB.
export interface ScheduleEntry {
  date: Date;
  session: PlanSession;
}

export type PainLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type CheckinPreference = 'keep' | 'tweak' | 'change';

export interface Checkin {
  id: string;
  client_id: string;
  plan_id: string;
  submitted_at: string;
  q_adherence: number;
  q_energy: number;
  q_difficulty: number;
  q_pain: PainLevel;
  q_progress: number;
  q_days_actual: number;
  q_preference: CheckinPreference;
}

export type CheckinInput = Omit<Checkin, 'id' | 'client_id' | 'submitted_at'>;

export type Signal =
  | 'ADHERENCE_LOW' | 'ADHERENCE_HIGH'
  | 'ENERGY_LOW' | 'ENERGY_HIGH'
  | 'DIFFICULTY_LOW' | 'DIFFICULTY_HIGH'
  | 'PROGRESS_LOW' | 'PROGRESS_HIGH'
  | 'PAIN_FLAG';

export interface PlanAdjustment {
  id: string;
  checkin_id: string;
  plan_id: string;
  signals: Signal[];
  action_taken: string;
  created_at: string;
}
