import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Exercise } from '../../models/fitness.model';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private supabase = inject(SupabaseService);

  // Ejercicios disponibles para un body_part dado, opcionalmente
  // filtrados por el equipamiento disponible. Usado por el
  // plan-generator para resolver cada bloque de un template.
  async findByBodyPart(bodyPart: string, equipment?: string[], limit = 20): Promise<Exercise[]> {
    let query = this.supabase
      .from('exercise')
      .select('*')
      .eq('body_part', bodyPart)
      .limit(limit);

    if (equipment?.length) {
      query = query.in('equipment', equipment);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching exercises:', error.message);
      return [];
    }
    return data as Exercise[];
  }

  async getByIds(ids: string[]): Promise<Map<string, Exercise>> {
    const map = new Map<string, Exercise>();
    if (!ids.length) return map;

    const { data, error } = await this.supabase
      .from('exercise')
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Error fetching exercises by id:', error.message);
      return map;
    }
    for (const ex of (data ?? []) as Exercise[]) map.set(ex.id, ex);
    return map;
  }

  // Lista de valores de equipment disponibles — para que el cuestionario
  // ofrezca opciones reales en vez de una lista hardcodeada que se
  // desincroniza del catálogo.
  async listEquipment(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('exercise')
      .select('equipment');

    if (error || !data) return [];
    return [...new Set((data as { equipment: string }[]).map(d => d.equipment))].sort();
  }
}
