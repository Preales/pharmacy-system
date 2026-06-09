import Dexie, { Table } from 'dexie';
import { OfflineSale } from '../../features/sales/models/offline-sale.model';

export class PharmacyDb extends Dexie {
  offlineSales!: Table<OfflineSale>;

  constructor() {
    super('PharmacyDb');
    this.version(1).stores({
      offlineSales: '++id, tenantId, createdAt, synced',
    });
  }
}

export const db = new PharmacyDb();
