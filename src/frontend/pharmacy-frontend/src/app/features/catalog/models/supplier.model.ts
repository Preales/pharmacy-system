export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface CreateSupplierRequest {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
}

export interface UpdateSupplierRequest {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  isActive: boolean;
}
