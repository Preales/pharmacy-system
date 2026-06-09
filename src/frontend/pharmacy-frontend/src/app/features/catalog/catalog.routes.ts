import { Routes } from '@angular/router';

export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./catalog-shell.component').then((m) => m.CatalogShellComponent),
    children: [
      {
        path: 'products',
        loadComponent: () =>
          import('./products/product-list.component').then((m) => m.ProductListComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./categories/category-list.component').then((m) => m.CategoryListComponent),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./suppliers/supplier-list.component').then((m) => m.SupplierListComponent),
      },
      { path: '', redirectTo: 'products', pathMatch: 'full' },
    ],
  },
];
