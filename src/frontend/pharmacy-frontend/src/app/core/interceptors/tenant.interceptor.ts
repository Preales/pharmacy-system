import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  // Prefer pendingTenantId (set during two-step login before a session exists)
  // over currentTenantId (derived from the authenticated user after login).
  const tenantId = authService.pendingTenantId() ?? authService.currentTenantId();

  if (tenantId) {
    req = req.clone({
      setHeaders: { 'X-Tenant-Id': tenantId },
    });
  }

  return next(req);
};
