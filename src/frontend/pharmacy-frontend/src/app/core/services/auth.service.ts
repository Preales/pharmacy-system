import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest, TenantSummaryDto } from '../models/auth.model';
import { environment } from '../../../environments/environment';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TENANT_ID_KEY = 'tenant_id';
const USER_KEY = 'current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<AuthUser | null>(this.loadUser());
  private readonly _token = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly _pendingTenantId = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentTenantId = computed(() => this._currentUser()?.tenantId ?? null);
  readonly pendingTenantId = this._pendingTenantId.asReadonly();

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TENANT_ID_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._currentUser.set(null);
    this._pendingTenantId.set(null);
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<AuthResponse> {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken: refresh })
      .pipe(tap((response) => this.persistSession(response)));
  }

  getTenantsByEmail(email: string): Observable<TenantSummaryDto[]> {
    return this.http.get<TenantSummaryDto[]>(
      `${environment.apiBaseUrl}/tenants/by-email`,
      { params: { email } }
    );
  }

  setPendingTenantId(id: string | null): void {
    this._pendingTenantId.set(id);
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(TENANT_ID_KEY, response.user.tenantId);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this._token.set(response.accessToken);
    this._currentUser.set(response.user);
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
