import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { InventoryItem, StockMovement, getStockStatus } from '../models/inventory-item.model';
import { RecordIngressRequest, CreateAdjustmentRequest } from '../models/inventory-request.models';
import { PagedResult } from '../../../core/models/shared.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/inventory`;

  readonly items = signal<PagedResult<InventoryItem>>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  readonly lowStockItems = signal<InventoryItem[]>([]);

  readonly movements = signal<PagedResult<StockMovement>>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  readonly loading = signal(false);
  readonly movementsLoading = signal(false);

  readonly lowStockCount = computed(() => this.lowStockItems().length);

  loadStock(page = 1, pageSize = 20, search?: string): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);

    this.http.get<PagedResult<InventoryItem>>(this.baseUrl, { params }).subscribe({
      next: (data) => {
        const mapped = {
          ...data,
          items: data.items.map((item) => ({ ...item, status: getStockStatus(item) })),
        };
        this.items.set(mapped);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadLowStock(): void {
    this.http.get<PagedResult<InventoryItem>>(`${this.baseUrl}/low-stock`).subscribe({
      next: (data) => this.lowStockItems.set(data.items),
      error: () => {},
    });
  }

  loadMovements(productId: string, page = 1, pageSize = 20): void {
    this.movementsLoading.set(true);
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    this.http
      .get<PagedResult<StockMovement>>(`${this.baseUrl}/${productId}/movements`, { params })
      .subscribe({
        next: (data) => {
          this.movements.set(data);
          this.movementsLoading.set(false);
        },
        error: () => this.movementsLoading.set(false),
      });
  }

  recordIngress(request: RecordIngressRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/ingress`, request)
      .pipe(tap(() => this.loadStock()));
  }

  createAdjustment(request: CreateAdjustmentRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/adjustment`, request)
      .pipe(tap(() => this.loadStock()));
  }
}
