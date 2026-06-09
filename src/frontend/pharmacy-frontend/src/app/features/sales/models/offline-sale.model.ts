export type OfflineSaleStatus = 'PendingSync' | 'Synced' | 'SyncFailed';

export interface OfflineSaleLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface OfflineSale {
  id?: number;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  lines: OfflineSaleLine[];
  totalAmount: number;
  createdAt: string;
  synced: boolean;
  status: OfflineSaleStatus;
  syncError?: string;
}
