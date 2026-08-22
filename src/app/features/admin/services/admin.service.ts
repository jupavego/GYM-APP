import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../app/core/services/supabase.service';
import { Profile, UserRole } from '../../../../app/core/models/profile.model';
import { Account, AccountStatus } from '../../../../app/core/models/account.model';

export interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  totalClients: number;
  totalAccounts: number;
  pendingAccounts: number;
  approvedAccounts: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private supabase = inject(SupabaseService);

  // ── Dashboard stats ────────────────────────────────────────────────────────
  // Usa la función SQL get_admin_stats() que hace los conteos directamente
  // en PostgreSQL — una sola round-trip sin importar cuántos registros haya.
  async getStats(): Promise<AdminStats> {
    const { data, error } = await this.supabase.client
      .rpc('get_admin_stats');

    if (error) {
      console.error('Error fetching stats:', error.message);
      return {
        totalUsers: 0, totalBusinesses: 0, totalClients: 0,
        totalAccounts: 0, pendingAccounts: 0, approvedAccounts: 0,
      };
    }

    return data as AdminStats;
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  async getUsers(role?: UserRole): Promise<Profile[]> {
    let query = this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) { console.error(error.message); return []; }
    return data as Profile[];
  }

  async updateUserRole(userId: string, role: UserRole): Promise<boolean> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    return !error;
  }

  // ── Accounts ───────────────────────────────────────────────────────────────
  async getAccounts(status?: AccountStatus): Promise<Account[]> {
    let query = this.supabase
      .from('accounts')
      .select('*, profiles(full_name, phone)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) { console.error(error.message); return []; }
    return data as Account[];
  }

  async updateAccountStatus(
    accountId: string,
    status: AccountStatus
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('accounts')
      .update({ status, active: status === 'approved' })
      .eq('id', accountId);
    return !error;
  }

}
