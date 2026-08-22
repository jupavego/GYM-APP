import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/profile.model';
import { SessionService } from '../services/session.service';

// Uso: canActivate: [authGuard, roleGuard], data: { roles: ['admin'] }
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const session      = inject(SessionService);
  const auth         = inject(AuthService);
  const router       = inject(Router);
  const allowedRoles = (route.data['roles'] ?? []) as UserRole[];

  if (allowedRoles.length === 0) return true;

  // El admin tiene acceso a todos los módulos (admin + instructor + cliente) —
  // útil para probar/navegar toda la app desde una sola sesión mientras no
  // hay cuentas de prueba separadas por rol.
  if (session.isAdmin()) return true;

  if (session.hasAnyRole(allowedRoles)) return true;

  // Redirige a su área usando AuthService como fuente única de verdad
  return router.createUrlTree([auth.getRouteForRole(session.role() ?? '')]);
};