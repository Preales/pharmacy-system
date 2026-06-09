import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./inventory-shell.component').then((m) => m.InventoryShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./containers/inventory-dashboard.component').then(
            (m) => m.InventoryDashboardComponent
          ),
      },
      {
        path: 'stock',
        loadComponent: () =>
          import('./containers/stock-list.component').then((m) => m.StockListComponent),
      },
      {
        path: 'movements',
        loadComponent: () =>
          import('./containers/movement-history.component').then(
            (m) => m.MovementHistoryComponent
          ),
      },
      {
        path: 'low-stock',
        loadComponent: () =>
          import('./containers/low-stock.component').then((m) => m.LowStockComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
