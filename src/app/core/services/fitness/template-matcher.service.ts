import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { ExperienceLevel, FitnessProfile, WorkoutTemplate } from '../../models/fitness.model';

const EXPERIENCE_ORDER: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

@Injectable({ providedIn: 'root' })
export class TemplateMatcherService {
  private supabase = inject(SupabaseService);

  async findBest(profile: FitnessProfile): Promise<WorkoutTemplate | null> {
    const { data, error } = await this.supabase
      .from('workout_template')
      .select('*');

    if (error || !data?.length) {
      console.error('Error fetching templates:', error?.message);
      return null;
    }

    const templates = data as WorkoutTemplate[];
    let best = templates[0];
    let bestScore = -Infinity;

    for (const t of templates) {
      const score = this.score(t, profile);
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }

    return best;
  }

  // Reglas de scoring (Dominio F, en código por ahora):
  // - días disponibles: cuanto más cerca de days_per_week, mejor
  // - experiencia: match exacto pesa más que uno adyacente
  // - objetivo: match con el principal pesa más que con el secundario
  private score(t: WorkoutTemplate, p: FitnessProfile): number {
    let score = 0;

    // Días — penaliza la distancia, pero nunca elige un template con
    // más días de los que el cliente tiene disponibles.
    if (t.days_per_week > p.days_available) return -1000;
    score -= Math.abs(t.days_per_week - p.days_available) * 10;

    // Experiencia
    const expDistance = Math.abs(
      EXPERIENCE_ORDER.indexOf(t.target_experience) - EXPERIENCE_ORDER.indexOf(p.experience_level)
    );
    score += expDistance === 0 ? 20 : expDistance === 1 ? 5 : -15;

    // Objetivo
    if (t.target_goal === p.goal_primary) score += 25;
    else if (p.goal_secondary && t.target_goal === p.goal_secondary) score += 10;

    return score;
  }
}
