import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard, roleGuard, businessGuard } from './core';
import { setupGuard } from './core/guards/setup.guard';

export const routes: Routes = [

  // ── Home pública ─────────────────────────────────────────────────────────
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/pages/home/home.component')
        .then(m => m.HomeComponent),
  },

  // ── Perfil personal ──────────────────────────────────────────────────────
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/client/pages/profile-edit/profile-edit.component')
        .then(m => m.ProfileEditComponent),
  },

  // ── Fitness Engine — expuesto sin restricción de plan (fase de pruebas) ───
  {
    path: 'fitness/questionnaire',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/fitness/pages/questionnaire/questionnaire.component')
        .then(m => m.QuestionnaireComponent),
  },
  {
    path: 'fitness/plan',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/fitness/pages/plan-view/plan-view.component')
        .then(m => m.PlanViewComponent),
  },
  {
    path: 'fitness/checkin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/fitness/pages/checkin/checkin.component')
        .then(m => m.CheckinComponent),
  },

  // ── Auth — layout propio, sin header global ──────────────────────────────
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component')
        .then(m => m.AuthLayoutComponent),
    children: [
      // Sin guard — Supabase establece sesión temporal con el token
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password.component')
            .then(m => m.ResetPasswordComponent),
      },
      // Callback de confirmación de email — también sin publicOnlyGuard
      {
        path: 'confirm',
        loadComponent: () =>
          import('../app/shared/pages/confirm/auth-confirm.component')
            .then(m => m.AuthConfirmComponent),
      },
      // Rutas solo para no logueados
      {
        path: '',
        canActivate: [publicOnlyGuard],
        children: [
          {
            path: 'login',
            loadComponent: () =>
              import('./features/auth/pages/login/login.component')
                .then(m => m.LoginComponent),
          },
          {
            path: 'register',
            loadComponent: () =>
              import('./features/auth/pages/register/register.component')
                .then(m => m.RegisterComponent),
          },
          {
            path: 'recover',
            loadComponent: () =>
              import('./features/auth/pages/recover/recover.component')
                .then(m => m.RecoverComponent),
          },
        ],
      },
    ],
  },

  // ── Panel de cuenta (rol business) — wizard de setup fuera del shell ──────
  {
    path: 'business/setup',
    canActivate: [authGuard, roleGuard, setupGuard],
    data: { roles: ['business'] },
    loadComponent: () =>
      import('./features/business/pages/account-setup/account-setup.component')
        .then(m => m.AccountSetupComponent),
  },
  {
    path: 'business',
    canActivate: [authGuard, roleGuard, businessGuard],
    data: { roles: ['business'] },
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout.component')
        .then(m => m.DashboardLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/business/pages/business-dashboard/business-dashboard.component')
            .then(m => m.BusinessDashboardComponent),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/business/pages/account-edit/account-edit.component')
            .then(m => m.AccountEditComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Panel admin ──────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout.component')
        .then(m => m.DashboardLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/pages/admin-dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/pages/users-list/users-list.component')
            .then(m => m.UsersListComponent),
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./features/admin/pages/accounts-list/accounts-list.component')
            .then(m => m.AccountsListComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Legal ────────────────────────────────────────────────────────────────
  {
    path: 'security',
    loadComponent: () =>
      import('./shared/pages/security-disclosure/security-disclosure.component')
        .then(m => m.SecurityDisclosureComponent),
  },
  {
    path: 'privacidad',
    loadComponent: () =>
      import('./shared/pages/privacy/privacy.component')
        .then(m => m.PrivacyComponent),
  },

  // ── 404 ──────────────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
  },
];
