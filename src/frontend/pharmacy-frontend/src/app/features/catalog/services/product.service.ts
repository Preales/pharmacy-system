import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductFilter,
} from '../models/product.model';
import { PagedResult } from '../../../core/models/shared.models';
import { Pagination } from '../../../core/constants/app.constants';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/products`;

  readonly products = signal<PagedResult<Product>>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: Pagination.DefaultPageSize,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  readonly loading = signal(false);

  loadPage(filter: ProductFilter): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', filter.pageNumber.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.search) params = params.set('search', filter.search);
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    if (filter.supplierId) params = params.set('supplierId', filter.supplierId);
    if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());

    this.http.get<PagedResult<Product>>(this.baseUrl, { params }).subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, request).pipe(
      tap(() => this.loadPage({ pageNumber: 1, pageSize: Pagination.DefaultPageSize }))
    );
  }

  update(id: string, request: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, request).pipe(
      tap((updated) =>
        this.products.update((paged) => ({
          ...paged,
          items: paged.items.map((p) => (p.id === id ? updated : p)),
        }))
      )
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() =>
        this.products.update((paged) => ({
          ...paged,
          items: paged.items.filter((p) => p.id !== id),
          totalCount: paged.totalCount - 1,
        }))
      )
    );
  }
}
