import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reports-shell.component').then((m) => m.ReportsShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./containers/reports-dashboard.component').then(
            (m) => m.ReportsDashboardComponent
          ),
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./containers/sales-report.component').then(
            (m) => m.SalesReportComponent
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./containers/inventory-report.component').then(
            (m) => m.InventoryReportComponent
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
