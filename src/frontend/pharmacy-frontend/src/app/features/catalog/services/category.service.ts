import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../models/category.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/categories`;

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);

  loadAll(): void {
    this.loading.set(true);
    this.http.get<Category[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(request: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, request).pipe(
      tap((created) => this.categories.update((list) => [...list, created]))
    );
  }

  update(id: string, request: UpdateCategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${this.baseUrl}/${id}`, request).pipe(
      tap((updated) =>
        this.categories.update((list) => list.map((c) => (c.id === id ? updated : c)))
      )
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.categories.update((list) => list.filter((c) => c.id !== id)))
    );
  }
}
