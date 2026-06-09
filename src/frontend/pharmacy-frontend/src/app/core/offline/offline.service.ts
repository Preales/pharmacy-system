import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { db } from './pharmacy-db';
import { OfflineSale } from '../../features/sales/models/offline-sale.model';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly salesUrl = `${environment.apiBaseUrl}/sales`;

  private readonly _isOnline = signal<boolean>(navigator.onLine);
  private readonly _pendingCount = signal<number>(0);
  private _syncing = false;

  readonly isOnline = this._isOnline.asReadonly();
  readonly pendingCount = computed(() => this._pendingCount());

  constructor() {
    window.addEventListener('online', () => {
      this._isOnline.set(true);
    });
    window.addEventListener('offline', () => {
      this._isOnline.set(false);
    });

    // Auto-sync when connection is restored
    effect(() => {
      if (this._isOnline()) {
        this.syncPending();
      }
    });

    // Load initial pending count
    this.refreshPendingCount();
  }

  async queueSale(sale: Omit<OfflineSale, 'id'>): Promise<void> {
    await db.offlineSales.add(sale);
    await this.refreshPendingCount();
  }

  async syncPending(): Promise<void> {
    if (this._syncing) return;
    this._syncing = true;

    try {
      const pendingSales = await db.offlineSales
        .where('synced')
        .equals(0)
        .toArray();

      for (const sale of pendingSales) {
        await this.syncSale(sale);
      }
    } finally {
      this._syncing = false;
      await this.refreshPendingCount();
    }
  }

  private async syncSale(sale: OfflineSale): Promise<void> {
    const body = {
      customerId: sale.customerId,
      lines: sale.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
      isOfflineSync: true,
    };

    try {
      await this.http.post(this.salesUrl, body).toPromise();
      await db.offlineSales.update(sale.id!, { synced: true, status: 'Synced' });
    } catch {
      await db.offlineSales.update(sale.id!, {
        status: 'SyncFailed',
        syncError: 'Failed to sync with server',
      });
    }
  }

  private async refreshPendingCount(): Promise<void> {
    const count = await db.offlineSales.where('synced').equals(0).count();
    this._pendingCount.set(count);
  }
}
