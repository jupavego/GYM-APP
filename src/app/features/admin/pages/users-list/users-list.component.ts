import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { Profile, UserRole } from '../../../../core/models/profile.model';
import { Membership, MEMBERSHIP_PLANS, PlanId } from '../../../../core/models/membership.model';
import { MembershipService } from '../../../../core/services/membership.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class UsersListComponent implements OnInit {
  private adminService      = inject(AdminService);
  private membershipService = inject(MembershipService);

  readonly plans = MEMBERSHIP_PLANS;

  users      = signal<Profile[]>([]);
  loading    = signal(true);
  searchText = signal('');
  roleFilter = signal<UserRole | 'all'>('all');

  memberships = signal<Map<string, Membership>>(new Map());

  grantFormForUserId = signal<string | null>(null);
  grantPlanId        = signal<PlanId>('mensual');
  grantSaving        = signal(false);

  filtered = computed(() => {
    const text = this.searchText().toLowerCase().trim();
    const role = this.roleFilter();

    return this.users().filter(u => {
      const matchesRole = role === 'all' || u.role === role;
      const matchesText = !text ||
        u.full_name?.toLowerCase().includes(text) ||
        u.phone?.toLowerCase().includes(text);
      return matchesRole && matchesText;
    });
  });

  async ngOnInit(): Promise<void> {
    const users = await this.adminService.getUsers();
    this.users.set(users);

    const clientIds = users.filter(u => u.role === 'client').map(u => u.id);
    this.memberships.set(await this.membershipService.getLatestByClientIds(clientIds));

    this.loading.set(false);
  }

  async onRoleChange(user: Profile, newRole: UserRole): Promise<void> {
    const ok = await this.adminService.updateUserRole(user.id, newRole);
    if (ok) {
      this.users.update(users =>
        users.map(u => u.id === user.id ? { ...u, role: newRole } : u)
      );
    }
  }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      admin:    'badge--admin',
      business: 'badge--business',
      client:   'badge--client',
    };
    return map[role] ?? '';
  }

  // ── Membresías ─────────────────────────────────────────────────────────────
  membershipStatusLabel(userId: string): string {
    const m = this.memberships().get(userId);
    if (!m) return 'Sin plan';
    const date = new Date(m.expires_at).toLocaleDateString('es-CO');
    return this.membershipService.isActive(m) ? `Activa hasta ${date}` : `Vencida el ${date}`;
  }

  membershipStatusClass(userId: string): string {
    const m = this.memberships().get(userId);
    if (!m) return 'badge--neutral';
    return this.membershipService.isActive(m) ? 'badge--success' : 'badge--danger';
  }

  openGrantForm(userId: string): void {
    this.grantFormForUserId.set(userId);
    this.grantPlanId.set('mensual');
  }

  closeGrantForm(): void {
    this.grantFormForUserId.set(null);
  }

  async submitGrant(userId: string): Promise<void> {
    this.grantSaving.set(true);

    const result = await this.membershipService.activate(userId, this.grantPlanId());

    if (result.success) {
      const updated = await this.membershipService.getLatestByClientIds([userId]);
      this.memberships.update(map => {
        const next = new Map(map);
        const membership = updated.get(userId);
        if (membership) next.set(userId, membership);
        return next;
      });
      this.grantFormForUserId.set(null);
    }

    this.grantSaving.set(false);
  }
}
