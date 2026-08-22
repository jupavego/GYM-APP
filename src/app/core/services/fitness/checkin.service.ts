import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { SessionService } from '../session.service';
import { Checkin, CheckinInput, PlanAdjustment, Signal } from '../../models/fitness.model';

@Injectable({ providedIn: 'root' })
export class CheckinService {
  private supabase = inject(SupabaseService);
  private session  = inject(SessionService);

  // Dominio H — interpreta las 7 respuestas y deriva las señales.
  // Funciones puras, sin efectos — fáciles de mover a una tabla de
  // reglas data-driven después sin tocar el resto del pipeline.
  deriveSignals(input: CheckinInput): Signal[] {
    const signals: Signal[] = [];

    if (input.q_adherence <= 2) signals.push('ADHERENCE_LOW');
    if (input.q_adherence >= 4) signals.push('ADHERENCE_HIGH');

    if (input.q_energy <= 2) signals.push('ENERGY_LOW');
    if (input.q_energy >= 4) signals.push('ENERGY_HIGH');

    if (input.q_difficulty <= 2) signals.push('DIFFICULTY_LOW');
    if (input.q_difficulty >= 4) signals.push('DIFFICULTY_HIGH');

    if (input.q_progress <= 2) signals.push('PROGRESS_LOW');
    if (input.q_progress >= 4) signals.push('PROGRESS_HIGH');

    if (input.q_pain === 'moderate' || input.q_pain === 'severe') signals.push('PAIN_FLAG');

    return signals;
  }

  // Dominio H — de las señales a la acción recomendada. Ninguna
  // acción se aplica automáticamente sobre el plan todavía (MVP:
  // solo se registra la recomendación) — evita ajustes agresivos
  // sin supervisión, sobre todo ante dolor.
  private recommend(signals: Signal[]): string {
    if (signals.includes('PAIN_FLAG')) {
      return 'Se reportó dolor moderado/importante — no se aplica ajuste automático. Se recomienda valoración profesional antes de continuar con el plan.';
    }
    if (signals.includes('ADHERENCE_LOW') && signals.includes('DIFFICULTY_HIGH')) {
      return 'Reducir complejidad y volumen del plan; revisar la frecuencia semanal disponible.';
    }
    if (signals.includes('ADHERENCE_HIGH') && signals.includes('PROGRESS_HIGH')) {
      return 'Mantener la estructura actual y progresar gradualmente (aumentar carga o series).';
    }
    if (signals.includes('ENERGY_LOW') && signals.includes('ADHERENCE_LOW')) {
      return 'Considerar reducir el volumen temporalmente y revisar recuperación/descanso.';
    }
    return 'Sin ajuste automático — mantener el plan actual y observar el próximo check-in.';
  }

  async submit(input: CheckinInput): Promise<{ success: boolean; error?: string; adjustment?: PlanAdjustment }> {
    const userId = this.session.user()?.id;
    if (!userId) return { success: false, error: 'No autenticado' };

    const { data: checkinRow, error: checkinError } = await this.supabase
      .from('checkin')
      .insert({ ...input, client_id: userId })
      .select()
      .single();

    if (checkinError) return { success: false, error: checkinError.message };
    const checkin = checkinRow as Checkin;

    const signals = this.deriveSignals(input);
    const action  = this.recommend(signals);

    const { data: adjustmentRow, error: adjustmentError } = await this.supabase
      .from('plan_adjustment')
      .insert({
        checkin_id: checkin.id,
        plan_id: input.plan_id,
        signals,
        action_taken: action,
      })
      .select()
      .single();

    if (adjustmentError) return { success: false, error: adjustmentError.message };

    return { success: true, adjustment: adjustmentRow as PlanAdjustment };
  }

  async getHistory(planId: string): Promise<{ checkin: Checkin; adjustment: PlanAdjustment | null }[]> {
    const { data: checkins, error } = await this.supabase
      .from('checkin')
      .select('*')
      .eq('plan_id', planId)
      .order('submitted_at', { ascending: false });

    if (error || !checkins?.length) return [];

    const { data: adjustments } = await this.supabase
      .from('plan_adjustment')
      .select('*')
      .in('checkin_id', (checkins as Checkin[]).map(c => c.id));

    const adjustmentByCheckin = new Map(
      ((adjustments ?? []) as PlanAdjustment[]).map(a => [a.checkin_id, a])
    );

    return (checkins as Checkin[]).map(checkin => ({
      checkin,
      adjustment: adjustmentByCheckin.get(checkin.id) ?? null,
    }));
  }
}
