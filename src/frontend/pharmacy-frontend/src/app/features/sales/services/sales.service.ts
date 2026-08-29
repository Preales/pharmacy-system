import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  Sale,
  SaleSummary,
  CreateSaleRequest,
  VoidSaleRequest,
  SaleFilter,
} from '../models/sale.model';
import { OfflineSale } from '../models/offline-sale.model';
import { PagedResult } from '../../../core/models/shared.models';
import { OfflineService } from '../../../core/offline/offline.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly offlineService = inject(OfflineService);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/sales`;

  readonly sales = signal<PagedResult<Sale>>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  readonly currentSale = signal<Sale | null>(null);
  readonly summary = signal<SaleSummary | null>(null);
  readonly loading = signal(false);

  loadSales(filter: SaleFilter = { pageNumber: 1, pageSize: 20 }): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', filter.pageNumber.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    if (filter.status) params = params.set('status', filter.status);

    this.http.get<PagedResult<Sale>>(this.baseUrl, { params }).subscribe({
      next: (data) => {
        this.sales.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getSaleById(id: string): void {
    this.http.get<Sale>(`${this.baseUrl}/${id}`).subscribe({
      next: (data) => this.currentSale.set(data),
      error: () => {},
    });
  }

  async createSale(request: CreateSaleRequest): Promise<Observable<Sale> | void> {
    if (!this.offlineService.isOnline()) {
      const tenantId = this.authService.currentTenantId() ?? '';
      const offlineSale: Omit<OfflineSale, 'id'> = {
        tenantId,
        customerId: request.customerId,
        lines: request.lines.map((l) => ({
          productId: l.productId,
          productName: '',
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        totalAmount: request.lines.reduce(
          (sum, l) => sum + l.quantity * l.unitPrice,
          0
        ),
        createdAt: new Date().toISOString(),
        synced: false,
        status: 'PendingSync',
      };
      await this.offlineService.queueSale(offlineSale);
      return;
    }

    return this.http.post<Sale>(this.baseUrl, request).pipe(
      tap(() => this.loadSales())
    );
  }

  voidSale(id: string, request: VoidSaleRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/void`, request).pipe(
      tap(() => this.loadSales())
    );
  }

  loadSummary(): void {
    this.http.get<SaleSummary>(`${this.baseUrl}/summary`).subscribe({
      next: (data) => this.summary.set(data),
      error: () => {},
    });
  }
}
