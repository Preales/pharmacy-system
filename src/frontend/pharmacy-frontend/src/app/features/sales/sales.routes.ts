import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { AppRoles } from '../../core/constants/app.constants';

export const SALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sales-shell.component').then((m) => m.SalesShellComponent),
    children: [
      {
        path: 'pos',
        loadComponent: () =>
          import('./containers/pos.component').then((m) => m.PosComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./containers/sales-history.component').then(
            (m) => m.SalesHistoryComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./containers/sale-detail.component').then(
            (m) => m.SaleDetailComponent
          ),
      },
      {
        path: 'conflict-alerts',
        canActivate: [roleGuard],
        data: { roles: [AppRoles.Admin, AppRoles.Pharmacist] },
        loadComponent: () =>
          import('./containers/conflict-alerts.component').then(
            (m) => m.ConflictAlertsComponent
          ),
      },
      {
        path: '',
        redirectTo: 'pos',
        pathMatch: 'full',
      },
    ],
  },
];
