export interface DailySales {
  date: string;
  saleCount: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface DashboardReport {
  totalSalesToday: number;
  totalRevenueToday: number;
  totalSalesThisMonth: number;
  totalRevenueThisMonth: number;
  averageTicket: number;
  topProductsThisMonth: TopProduct[];
  lowStockProductsCount: number;
  pendingConflictAlertsCount: number;
}

export interface SalesReport {
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  dailySales: DailySales[];
  topProducts: TopProduct[];
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  lowStockThreshold: number;
  costPrice: number;
}

export interface InventoryReport {
  totalProducts: number;
  lowStockProducts: number;
  zeroStockProducts: number;
  totalStockValue: number;
  lowStockItems: LowStockProduct[];
}
