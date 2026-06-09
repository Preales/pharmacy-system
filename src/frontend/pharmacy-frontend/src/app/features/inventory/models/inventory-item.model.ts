export type MovementType = 'Ingress' | 'Sale' | 'Adjustment' | 'Loss';

export type StockStatus = 'OK' | 'Low' | 'Critical';

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  currentStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  status: StockStatus;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  movementType: MovementType;
  quantity: number;
  reason: string | null;
  batchNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  userId: string;
  userEmail: string | null;
  timestamp: string;
}

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.currentStock <= 0) return 'Critical';
  if (item.isLowStock) return 'Low';
  return 'OK';
}
