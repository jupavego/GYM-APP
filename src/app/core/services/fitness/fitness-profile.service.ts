import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { SessionService } from '../session.service';
import { FitnessProfile, FitnessProfileInput } from '../../models/fitness.model';

@Injectable({ providedIn: 'root' })
export class FitnessProfileService {
  private supabase = inject(SupabaseService);
  private session  = inject(SessionService);

  async getMine(): Promise<FitnessProfile | null> {
    const userId = this.session.user()?.id;
    if (!userId) return null;

    const { data, error } = await this.supabase
      .from('fitness_profile')
      .select('*')
      .eq('client_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching fitness profile:', error.message);
      return null;
    }
    return data as FitnessProfile | null;
  }

  // Crea el perfil si no existe, o lo actualiza si ya lo tenía (re-tomar el cuestionario).
  async save(input: FitnessProfileInput): Promise<{ success: boolean; error?: string }> {
    const userId = this.session.user()?.id;
    if (!userId) return { success: false, error: 'No autenticado' };

    const { error } = await this.supabase
      .from('fitness_profile')
      .upsert(
        { ...input, client_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'client_id' }
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  }
}
