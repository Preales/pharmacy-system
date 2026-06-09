import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppRoles } from './core/constants/app.constants';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./core/components/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
  },
  {
    path: 'catalog',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/inventory/inventory.routes').then(
        (m) => m.INVENTORY_ROUTES
      ),
  },
  {
    path: 'sales',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/sales/sales.routes').then((m) => m.SALES_ROUTES),
  },
  {
    path: 'reports',
    canActivate: [authGuard, roleGuard],
    data: { roles: [AppRoles.Admin, AppRoles.Pharmacist] },
    loadChildren: () =>
      import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
  },
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },
  { path: '**', redirectTo: 'catalog' },
];
