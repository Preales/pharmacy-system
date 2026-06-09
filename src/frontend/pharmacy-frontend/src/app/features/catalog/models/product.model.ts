export type ProductUnit = 'Unit' | 'Box' | 'Blister' | 'Bottle';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  unitPrice: number;
  costPrice: number;
  unit: ProductUnit;
  barcode: string | null;
  isActive: boolean;
  stockQuantity: number;
  categoryId: string;
  categoryName: string;
  supplierId: string | null;
  supplierName: string | null;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  description: string | null;
  unitPrice: number;
  costPrice: number;
  unit: ProductUnit;
  barcode: string | null;
  categoryId: string;
  supplierId: string | null;
}

export interface UpdateProductRequest {
  name: string;
  description: string | null;
  unitPrice: number;
  costPrice: number;
  unit: ProductUnit;
  barcode: string | null;
  isActive: boolean;
  categoryId: string;
  supplierId: string | null;
}

export interface ProductFilter {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  isActive?: boolean;
  pageNumber: number;
  pageSize: number;
}
