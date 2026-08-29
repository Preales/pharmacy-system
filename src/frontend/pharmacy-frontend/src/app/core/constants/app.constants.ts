export const AppRoles = {
  Admin: 'Admin',
  Pharmacist: 'Pharmacist',
  Cashier: 'Cashier',
} as const;

export const AppStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
} as const;

export const Pagination: { DefaultPageSize: number; PageSizeOptions: number[] } = {
  DefaultPageSize: 20,
  PageSizeOptions: [10, 25, 50],
};

export const AppCurrency = {
  COP: 'COP',
} as const;

export const LowStockThreshold = 10 as const;
