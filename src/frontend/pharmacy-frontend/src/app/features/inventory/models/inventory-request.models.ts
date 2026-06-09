export interface RecordIngressRequest {
  productId: string;
  quantity: number;
  unitCost: number;
  supplierId?: string | null;
  batchNumber?: string | null;
  reason?: string | null;
}

export interface CreateAdjustmentRequest {
  productId: string;
  quantity: number;
  reason: string;
}
