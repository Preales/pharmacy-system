# Delta for identity-auth

## ADDED Requirements

### Requirement: Role Check Helper

`AuthService` MUST expose `hasRole(role: string): boolean`. The method MUST evaluate `this._currentUser()?.roles?.includes(role)` and return `false` when no user is present.

#### Scenario: Role present in token

- GIVEN the current user has `roles: ['Admin', 'Pharmacist']`
- WHEN `authService.hasRole('Admin')` is called
- THEN it returns `true`

#### Scenario: Role absent

- GIVEN the current user has `roles: ['Cashier']`
- WHEN `authService.hasRole('Admin')` is called
- THEN it returns `false`

#### Scenario: No authenticated user

- GIVEN no user is loaded (signal is null)
- WHEN `authService.hasRole('Admin')` is called
- THEN it returns `false` without throwing

---

### Requirement: User Management Endpoints Contract

The backend MUST expose four endpoints under `/api/v1/users`:

| Method | Path | Role Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/v1/users` | Admin | Create user |
| PUT | `/api/v1/users/{id}` | Admin | Update user name or role |
| DELETE | `/api/v1/users/{id}` | Admin | Deactivate user (soft delete) |
| PUT | `/api/v1/users/{id}/role` | Admin | Change user role only |

All endpoints MUST be tenant-scoped. Non-Admin callers MUST receive HTTP 403.

#### Scenario: Admin creates user

- GIVEN a valid Admin JWT and a request body `{ email, name, role, tenantId }`
- WHEN POST `/api/v1/users` is called
- THEN HTTP 201 is returned with the created user's id

#### Scenario: Admin deactivates user

- GIVEN a target user `id` that is currently active
- WHEN DELETE `/api/v1/users/{id}` is called by an Admin
- THEN `isActive` is set to `false`; the user record is NOT deleted
- AND HTTP 204 is returned

#### Scenario: Pharmacist attempts user creation

- GIVEN a valid Pharmacist JWT
- WHEN POST `/api/v1/users` is called
- THEN HTTP 403 is returned

---

### Requirement: User Model Contract Alignment

`UserDto.Role` (string, singular) on the backend MUST map to `UserModel.role` (string) on the frontend. `AuthUser.roles` (string[]) MUST remain unchanged and is used only for authorization decisions. These MUST NOT be conflated.

#### Scenario: Frontend maps UserDto to UserModel

- GIVEN a `UserDto` with `Role: "Pharmacist"` from the API
- WHEN the frontend maps it to `UserModel`
- THEN `userModel.role === 'Pharmacist'`
- AND `AuthUser.roles` is unaffected

## MODIFIED Requirements

### Requirement: Role-Based Authorization

The system MUST enforce three roles: Admin, Pharmacist, Cashier. Admin MUST have full CRUD access. Pharmacist MUST have read/write for catalog, inventory, and sales. Cashier MUST have read-only catalog access and sales creation.
(Previously: third role was named "Clerk")

#### Scenario: Cashier attempts product deletion

- GIVEN a user with role Cashier
- WHEN they attempt DELETE `/api/v1/products/{id}`
- THEN HTTP 403 Forbidden is returned

#### Scenario: Admin manages users

- GIVEN a user with role Admin
- WHEN they GET `/api/v1/users`
- THEN all users within their tenant are returned

### Requirement: Route Protection (Frontend)

The Angular app MUST use functional route guards to protect routes. Unauthenticated users MUST be redirected to login. Routes MUST be restricted by role using `hasRole()`. JWT token MUST be injected via functional HTTP interceptor. The interceptor MUST attach the `X-Tenant-Id` header on every outbound API request.
(Previously: no `X-Tenant-Id` header requirement; `hasRole()` not yet defined)

#### Scenario: Unauthenticated access to protected route

- GIVEN a user without a valid JWT
- WHEN they navigate to `/inventory`
- THEN they are redirected to `/auth/login`

#### Scenario: Interceptor attaches X-Tenant-Id

- GIVEN an authenticated user with `tenantId: "tenant-abc"` in their JWT claims
- WHEN any HTTP request is made to `/api/v1/**`
- THEN the request includes header `X-Tenant-Id: tenant-abc`
