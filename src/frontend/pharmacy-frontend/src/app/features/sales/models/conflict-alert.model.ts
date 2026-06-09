export type ConflictAlertStatus = 'Unresolved' | 'Resolved';

export interface ConflictAlert {
  id: string;
  saleId: string;
  saleNumber: string;
  productId: string;
  productName: string;
  expectedStock: number;
  actualStock: number;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  isResolved: boolean;
}

export interface ConflictAlertFilter {
  pageNumber: number;
  pageSize: number;
  isResolved?: boolean;
}
