export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  role?: string;      // backend sends singular 'role'; normalized to roles[] on persist
  tenantId: string;
}

export interface TenantSummaryDto {
  id: string;
  name: string;
  slug: string;
}
