import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  UserModel,
  CreateUserRequest,
  UpdateUserRequest,
  ChangeRoleRequest,
} from '../models/user.model';
import { PagedResult } from '../../../core/models/shared.models';
import { Pagination } from '../../../core/constants/app.constants';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  readonly users = signal<PagedResult<UserModel>>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: Pagination.DefaultPageSize,
    totalPages: 0,
  });
  readonly loading = signal(false);

  loadAll(page = 1, pageSize = Pagination.DefaultPageSize, role?: string, isActive?: boolean): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (role) params = params.set('role', role);
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());

    this.http.get<PagedResult<UserModel>>(this.baseUrl, { params }).subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(request: CreateUserRequest): Observable<UserModel> {
    return this.http.post<UserModel>(this.baseUrl, request).pipe(
      tap(() => this.loadAll())
    );
  }

  update(id: string, request: UpdateUserRequest): Observable<UserModel> {
    return this.http.put<UserModel>(`${this.baseUrl}/${id}`, request).pipe(
      tap((updated) =>
        this.users.update((paged) => ({
          ...paged,
          items: paged.items.map((u: UserModel) => (u.id === id ? updated : u)),
        }))
      )
    );
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() =>
        this.users.update((paged) => ({
          ...paged,
          items: paged.items.map((u: UserModel) =>
            u.id === id ? { ...u, isActive: false } : u
          ),
        }))
      )
    );
  }

  changeRole(id: string, request: ChangeRoleRequest): Observable<UserModel> {
    return this.http.put<UserModel>(`${this.baseUrl}/${id}/role`, request).pipe(
      tap((updated) =>
        this.users.update((paged) => ({
          ...paged,
          items: paged.items.map((u: UserModel) => (u.id === id ? updated : u)),
        }))
      )
    );
  }
}
