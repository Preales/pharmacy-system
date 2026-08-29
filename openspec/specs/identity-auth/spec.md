# Identity & Auth Specification

## Purpose

Manages user registration, authentication via JWT, role-based authorization, and tenant-scoped access control. All operations MUST be tenant-isolated.

## Requirements

### Requirement: Tenant Management

The system MUST support multi-tenant isolation from day 1. Each tenant represents a pharmacy.
A `TenantId` MUST be present on every data entity (except global lookup tables).
API requests MUST resolve tenant context from JWT claims. Cross-tenant data access MUST be impossible at the query layer (EF Core global query filters).

#### Scenario: Tenant creation

- GIVEN an admin with super-admin privileges
- WHEN they create a new tenant with name "Farmacia Central"
- THEN a Tenant record is created with a unique TenantId
- AND a default Admin user is provisioned for that tenant

#### Scenario: Tenant isolation in queries

- GIVEN User A belongs to Tenant 1 and User B to Tenant 2
- WHEN User A queries products
- THEN only Tenant 1 products are returned
- AND no Tenant 2 data is visible regardless of query parameters

### Requirement: User Registration

The system MUST allow tenant-scoped user registration using ASP.NET Identity. Users MUST be associated with exactly one tenant. Registration MUST validate email uniqueness within the tenant scope.

#### Scenario: Register new user

- GIVEN a valid tenant context
- WHEN a new user registers with email, password, and full name
    - THEN the user is created with the default role (Cashier)
- AND the user is associated with the current tenant

#### Scenario: Duplicate email within tenant

- GIVEN a user "clerk@farm.com" already exists in Tenant 1
- WHEN another registration with "clerk@farm.com" is attempted in Tenant 1
- THEN registration fails with a validation error

#### Scenario: Same email across tenants

- GIVEN "clerk@farm.com" exists in Tenant 1
- WHEN "clerk@farm.com" registers in Tenant 2
- THEN registration succeeds (email uniqueness is per-tenant)

### Requirement: JWT Authentication

The system MUST issue JWT tokens upon successful login. Tokens MUST include `sub`, `tenantId`, `roles`, and `exp` claims. Token lifetime SHOULD be 60 minutes. Refresh tokens are deferred to post-v1.

#### Scenario: Successful login

- GIVEN a registered user with valid credentials
- WHEN they POST to `/api/v1/auth/login` with email and password
- THEN a JWT token is returned with correct claims
- AND HTTP 200 status

#### Scenario: Invalid credentials

- GIVEN an incorrect password
- WHEN login is attempted
- THEN HTTP 401 is returned with a ProblemDetails error
- AND no token is issued

### Requirement: Role Check Helper

`AuthService` MUST expose `hasRole(role: string): boolean` backed by `this._currentUser()?.roles?.includes(role)`. Returns `false` when no user is present.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Role present | roles: ['Admin'] | hasRole('Admin') | returns true |
| Role absent | roles: ['Cashier'] | hasRole('Admin') | returns false |
| No user | signal is null | hasRole('Admin') | returns false, no throw |

### Requirement: User Management Endpoints Contract

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/v1/users` | Admin | Create user |
| PUT | `/api/v1/users/{id}` | Admin | Update name/role |
| DELETE | `/api/v1/users/{id}` | Admin | Soft deactivate |
| PUT | `/api/v1/users/{id}/role` | Admin | Change role only |

Non-Admin callers MUST receive HTTP 403. All endpoints MUST be tenant-scoped.

**Scenarios**: Admin creates → HTTP 201; Admin deactivates → `isActive=false`, HTTP 204, no hard delete; Pharmacist creates → HTTP 403.

### Requirement: User Model Contract Alignment

`UserDto.Role` (string) → maps to → `UserModel.role` (string). `AuthUser.roles` (string[]) is for authorization only. These MUST NOT be conflated.

**Scenario**: `UserDto.Role: "Pharmacist"` → `userModel.role === 'Pharmacist'`; `AuthUser.roles` unaffected.

### Requirement: Role-Based Authorization

The system MUST enforce three roles: Admin, Pharmacist, Cashier. Admin MUST have full CRUD access. Pharmacist MUST have read/write for catalog, inventory, and sales. Cashier MUST have read-only catalog access and sales creation.

#### Scenario: Cashier attempts product deletion

- GIVEN a user with role Cashier
- WHEN they attempt DELETE `/api/v1/products/{id}`
- THEN HTTP 403 Forbidden is returned

#### Scenario: Admin manages users

- GIVEN a user with role Admin
- WHEN they GET `/api/v1/users`
- THEN all users within their tenant are returned

### Requirement: Route Protection (Frontend)

The Angular app MUST use functional route guards to protect routes. Unauthenticated users MUST be redirected to login. Routes MUST be restricted by role. JWT token MUST be injected via functional HTTP interceptor. The interceptor MUST attach the `X-Tenant-Id` header (from the JWT `tenantId` claim) on every `/api/**` request. Without this header, `TenantMiddleware` returns HTTP 400.

#### Scenario: Unauthenticated access to protected route

- GIVEN a user without a valid JWT
- WHEN they navigate to `/inventory`
- THEN they are redirected to `/auth/login`

#### Scenario: Tenant header attached to API requests

- GIVEN a logged-in user with tenantId in their JWT
- WHEN they make any request to `/api/**`
- THEN the interceptor adds `X-Tenant-Id` header to the request
