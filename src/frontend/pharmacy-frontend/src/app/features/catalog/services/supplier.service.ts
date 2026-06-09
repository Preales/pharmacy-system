import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../models/supplier.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/suppliers`;

  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(false);

  loadAll(): void {
    this.loading.set(true);
    this.http.get<Supplier[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.suppliers.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(request: CreateSupplierRequest): Observable<Supplier> {
    return this.http.post<Supplier>(this.baseUrl, request).pipe(
      tap((created) => this.suppliers.update((list) => [...list, created]))
    );
  }

  update(id: string, request: UpdateSupplierRequest): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.baseUrl}/${id}`, request).pipe(
      tap((updated) =>
        this.suppliers.update((list) => list.map((s) => (s.id === id ? updated : s)))
      )
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.suppliers.update((list) => list.filter((s) => s.id !== id)))
    );
  }
}
