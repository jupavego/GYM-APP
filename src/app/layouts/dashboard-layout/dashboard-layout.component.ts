import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { AuthService } from '../../core/services/auth.service';
import { UserWidgetComponent } from '../../shared/components/user-widget/user-widget.component';
import { SITE } from '../../data/site.data';

export interface DashboardNavItem {
  label: string;
  route: string;
  icon: 'home' | 'account' | 'users' | 'fitness';
}

// Ítems de navegación por rol. Editar aquí para agregar secciones
// nuevas al panel de admin o de cuenta.
//
// El admin ve TODOS los módulos (admin + instructor + cliente) en su
// sidebar — no solo tiene permiso vía roleGuard/businessGuard (ver
// core/guards/), sino que además queda expuesto en la navegación para
// poder recorrer toda la app desde una sola sesión mientras no hay
// cuentas de prueba separadas por rol.
const NAV_BY_ROLE: Record<string, DashboardNavItem[]> = {
  admin: [
    { label: 'Panel',              route: '/admin/dashboard',    icon: 'home' },
    { label: 'Cuentas',            route: '/admin/accounts',     icon: 'account' },
    { label: 'Usuarios',           route: '/admin/users',        icon: 'users' },
    { label: 'Panel instructor',   route: '/business/dashboard', icon: 'home' },
    { label: 'Perfil instructor',  route: '/business/account',   icon: 'account' },
    { label: 'Mi perfil',          route: '/profile',            icon: 'account' },
    { label: 'Fitness Engine',     route: '/fitness/plan',       icon: 'fitness' },
  ],
  business: [
    { label: 'Panel',        route: '/business/dashboard', icon: 'home' },
    { label: 'Editar perfil', route: '/business/account',   icon: 'account' },
  ],
};

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, UserWidgetComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {
  private session = inject(SessionService);
  private auth    = inject(AuthService);

  readonly siteName = SITE.name;

  sidebarOpen = signal(false);

  readonly navItems = computed<DashboardNavItem[]>(() =>
    NAV_BY_ROLE[this.session.role() ?? ''] ?? []
  );

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
