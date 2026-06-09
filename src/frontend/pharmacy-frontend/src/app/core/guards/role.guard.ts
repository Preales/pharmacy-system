import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Role-based route guard.
 * Usage: canActivate: [roleGuard], data: { roles: ['Admin'] }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles: string[] = route.data?.['roles'] ?? [];
  const currentUser = authService.currentUser();

  if (!currentUser) {
    return router.createUrlTree(['/auth/login']);
  }

  if (requiredRoles.length === 0) {
    return true;
  }

  const userRoles: string[] = currentUser.roles ?? [];
  const hasRole = requiredRoles.some((r) => userRoles.includes(r));

  if (!hasRole) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
