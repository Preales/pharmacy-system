export const AppRoles = {
  Admin: 'Admin',
  Pharmacist: 'Pharmacist',
  Cashier: 'Cashier',
} as const;

export const AppStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
} as const;

export const Pagination = {
  DefaultPageSize: 20,
  PageSizeOptions: [10, 20, 50],
} as const;
