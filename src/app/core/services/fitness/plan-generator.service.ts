import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { SessionService } from '../session.service';
import { ExerciseService } from './exercise.service';
import { TemplateMatcherService } from './template-matcher.service';
import {
  ExperienceLevel, FitnessProfile, Goal, PlanExerciseEntry,
  PlanSession, ScheduleEntry, WorkoutPlan,
} from '../../models/fitness.model';

export interface GeneratedPlan {
  plan: WorkoutPlan;
  sessions: PlanSession[];
}

// Reglas de series/repeticiones/descanso — Dominio F, en código por
// ahora (ver plan de simplificación en supabase/migrations/007).
function prescribe(experience: ExperienceLevel, goal: Goal): { sets: number; reps: number; rest_sec: number } {
  const sets = experience === 'beginner' ? 3 : experience === 'intermediate' ? 4 : 5;

  const repsByGoal: Record<Goal, number> = {
    strength:    experience === 'beginner' ? 8 : experience === 'intermediate' ? 6 : 4,
    hypertrophy: experience === 'beginner' ? 12 : experience === 'intermediate' ? 10 : 8,
    fat_loss:    15,
    fitness:     12,
    functional:  12,
    maintenance: 10,
  };

  const restByGoal: Record<Goal, number> = {
    strength: 120, hypertrophy: 75, fat_loss: 45,
    fitness: 60, functional: 60, maintenance: 60,
  };

  return { sets, reps: repsByGoal[goal], rest_sec: restByGoal[goal] };
}

@Injectable({ providedIn: 'root' })
export class PlanGeneratorService {
  private supabase         = inject(SupabaseService);
  private session          = inject(SessionService);
  private exerciseService  = inject(ExerciseService);
  private templateMatcher  = inject(TemplateMatcherService);

  async generate(profile: FitnessProfile): Promise<{ success: boolean; data?: GeneratedPlan; error?: string }> {
    const userId = this.session.user()?.id;
    if (!userId) return { success: false, error: 'No autenticado' };

    const template = await this.templateMatcher.findBest(profile);
    if (!template) return { success: false, error: 'No hay templates disponibles' };

    const horizonWeeks = profile.horizon === 'short' ? 4 : profile.horizon === 'medium' ? 8 : 12;

    const { data: planRow, error: planError } = await this.supabase
      .from('workout_plan')
      .insert({
        client_id: userId,
        template_id: template.id,
        status: 'active',
        horizon_weeks: horizonWeeks,
      })
      .select()
      .single();

    if (planError) return { success: false, error: planError.message };
    const plan = planRow as WorkoutPlan;

    const { sets, reps, rest_sec } = prescribe(profile.experience_level, profile.goal_primary);

    const sessionsToInsert: { plan_id: string; day_label: string; day_index: number; exercises: PlanExerciseEntry[] }[] = [];

    for (let i = 0; i < template.structure.days.length; i++) {
      const day = template.structure.days[i];
      const exercises: PlanExerciseEntry[] = [];

      for (const block of day.blocks) {
        const pool = await this.exerciseService.findByBodyPart(block.body_part, undefined, block.count * 3);
        const picked = pool.slice(0, block.count);
        for (const ex of picked) {
          exercises.push({ exercise_id: ex.id, sets, reps, rest_sec });
        }
      }

      sessionsToInsert.push({ plan_id: plan.id, day_label: day.label, day_index: i, exercises });
    }

    const { data: sessionRows, error: sessionsError } = await this.supabase
      .from('plan_session')
      .insert(sessionsToInsert)
      .select();

    if (sessionsError) return { success: false, error: sessionsError.message };

    return { success: true, data: { plan, sessions: sessionRows as PlanSession[] } };
  }

  async getActivePlan(): Promise<GeneratedPlan | null> {
    const userId = this.session.user()?.id;
    if (!userId) return null;

    const { data: planRow, error: planError } = await this.supabase
      .from('workout_plan')
      .select('*')
      .eq('client_id', userId)
      .eq('status', 'active')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError || !planRow) return null;
    const plan = planRow as WorkoutPlan;

    const { data: sessionRows } = await this.supabase
      .from('plan_session')
      .select('*')
      .eq('plan_id', plan.id)
      .order('day_index', { ascending: true });

    return { plan, sessions: (sessionRows ?? []) as PlanSession[] };
  }

  // Cronograma — determinístico, no se almacena. Recorre día a día desde
  // start_date por horizon_weeks*7 días; cuando el día de la semana está
  // en preferredWeekdays, asigna la siguiente sesión en rotación cíclica
  // (las sesiones ya vienen ordenadas por day_index).
  buildSchedule(plan: WorkoutPlan, sessions: PlanSession[], preferredWeekdays: number[]): ScheduleEntry[] {
    if (!sessions.length || !preferredWeekdays.length) return [];

    const entries: ScheduleEntry[] = [];
    const totalDays = plan.horizon_weeks * 7;
    const start = this.parseDate(plan.start_date);

    let sessionCursor = 0;
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      // JS: 0=domingo..6=sábado → ISO: 0=lunes..6=domingo
      const isoWeekday = (date.getDay() + 6) % 7;

      if (preferredWeekdays.includes(isoWeekday)) {
        entries.push({ date, session: sessions[sessionCursor % sessions.length] });
        sessionCursor++;
      }
    }

    return entries;
  }

  private parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
