export type SaleStatus = 'Completed' | 'Voided';

export interface SaleLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  saleDate: string;
  customerId: string | null;
  customerName: string | null;
  status: SaleStatus;
  totalAmount: number;
  isOfflineSync: boolean;
  lines: SaleLine[];
}

export interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  period: string;
}

export interface CreateSaleRequest {
  customerId?: string;
  lines: CreateSaleLineRequest[];
  isOfflineSync?: boolean;
}

export interface CreateSaleLineRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface VoidSaleRequest {
  reason: string;
}

export interface SaleFilter {
  pageNumber: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  status?: SaleStatus;
}
