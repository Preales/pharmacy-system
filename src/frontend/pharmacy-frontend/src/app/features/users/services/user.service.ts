import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ChangeRoleRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserModel,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  readonly users = signal<UserModel[]>([]);
  readonly loading = signal(false);

  loadAll(role?: string, isActive?: boolean): void {
    this.loading.set(true);
    let params = new HttpParams();
    if (role) params = params.set('role', role);
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());

    this.http.get<UserModel[]>(this.baseUrl, { params }).subscribe({
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
        this.users.update((list) => list.map((u) => (u.id === id ? updated : u)))
      )
    );
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() =>
        this.users.update((list) =>
          list.map((u) => (u.id === id ? { ...u, isActive: false } : u))
        )
      )
    );
  }

  changeRole(id: string, request: ChangeRoleRequest): Observable<UserModel> {
    return this.http.put<UserModel>(`${this.baseUrl}/${id}/role`, request).pipe(
      tap((updated) =>
        this.users.update((list) => list.map((u) => (u.id === id ? updated : u)))
      )
    );
  }
}
