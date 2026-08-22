import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SessionService } from './session.service';
import { Membership, PlanId, getPlanDef } from '../models/membership.model';

export interface ActivateResult {
  success: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class MembershipService {
  private supabase = inject(SupabaseService);
  private session  = inject(SessionService);

  // Última membresía del cliente logueado — usada en su propio perfil.
  async getMyMembership(): Promise<Membership | null> {
    const userId = this.session.user()?.id;
    if (!userId) return null;
    return this.getLatestFor(userId);
  }

  private async getLatestFor(clientId: string): Promise<Membership | null> {
    const { data, error } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('client_id', clientId)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching membership:', error.message);
      return null;
    }
    return data as Membership | null;
  }

  // Última membresía de cada cliente en la lista — usada por el admin
  // para pintar la columna de estado en la tabla de usuarios.
  async getLatestByClientIds(clientIds: string[]): Promise<Map<string, Membership>> {
    const map = new Map<string, Membership>();
    if (!clientIds.length) return map;

    const { data, error } = await this.supabase
      .from('memberships')
      .select('*')
      .in('client_id', clientIds)
      .order('expires_at', { ascending: false });

    if (error) {
      console.error('Error fetching memberships:', error.message);
      return map;
    }

    // La primera fila que se ve por cliente es la de expires_at más
    // reciente (ya viene ordenado), así que solo se toma la primera.
    for (const row of (data ?? []) as Membership[]) {
      if (!map.has(row.client_id)) map.set(row.client_id, row);
    }
    return map;
  }

  // Activa/renueva el plan de un cliente — inserta una fila nueva.
  async activate(clientId: string, planId: PlanId): Promise<ActivateResult> {
    const adminId = this.session.user()?.id;
    if (!adminId) return { success: false, error: 'No autenticado' };

    const months = getPlanDef(planId).months;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { error } = await this.supabase
      .from('memberships')
      .insert({
        client_id: clientId,
        plan_id: planId,
        expires_at: expiresAt.toISOString(),
        activated_by: adminId,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  isActive(membership: Membership | null | undefined): boolean {
    return !!membership && new Date(membership.expires_at) > new Date();
  }
}
