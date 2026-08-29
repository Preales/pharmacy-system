# Specs: Bug Fixes & User Management

## identity-auth (Delta)

### ADDED: Role Check Helper

`AuthService` MUST expose `hasRole(role: string): boolean` backed by `this._currentUser()?.roles?.includes(role)`. Returns `false` when no user is present.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Role present | roles: ['Admin'] | hasRole('Admin') | returns true |
| Role absent | roles: ['Cashier'] | hasRole('Admin') | returns false |
| No user | signal is null | hasRole('Admin') | returns false, no throw |

### ADDED: User Management Endpoints Contract

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/v1/users` | Admin | Create user |
| PUT | `/api/v1/users/{id}` | Admin | Update name/role |
| DELETE | `/api/v1/users/{id}` | Admin | Soft deactivate |
| PUT | `/api/v1/users/{id}/role` | Admin | Change role only |

Non-Admin callers MUST receive HTTP 403. All endpoints MUST be tenant-scoped.

**Scenarios**: Admin creates → HTTP 201; Admin deactivates → `isActive=false`, HTTP 204, no hard delete; Pharmacist creates → HTTP 403.

### ADDED: User Model Contract Alignment

`UserDto.Role` (string) → maps to → `UserModel.role` (string). `AuthUser.roles` (string[]) is for authorization only. These MUST NOT be conflated.

**Scenario**: `UserDto.Role: "Pharmacist"` → `userModel.role === 'Pharmacist'`; `AuthUser.roles` unaffected.

### MODIFIED: Role-Based Authorization

Third role renamed from **Clerk** → **Cashier**. All existing authorization rules apply with the new name.

### MODIFIED: Route Protection (Frontend)

Interceptor MUST now attach `X-Tenant-Id` header (from JWT `tenantId` claim) on every `/api/**` request. Without it, `TenantMiddleware` returns HTTP 400.

---

## user-management (New Full Spec)

### Requirement: List Users

Paginated (default pageSize: 20), filterable by `role` and `isActive`. Admin only — HTTP 403 for others. Tenant-scoped.

**Scenarios**: Admin lists → paginated + total count; filter by role → filtered results; Pharmacist access → HTTP 403.

### Requirement: Create User

Fields: `email`, `name`, `role` (Admin|Pharmacist|Cashier), `tenantId`. Email unique per tenant.

**Scenarios**: Valid create → HTTP 201, `isActive: true`; duplicate email → HTTP 409.

### Requirement: Edit User

Admin updates `name` and/or `role`. Email MUST NOT be editable. Partial updates allowed.

**Scenarios**: Update name → HTTP 200 with updated user; email field in body → ignored.

### Requirement: Deactivate User

Soft delete via `isActive = false`. Record NOT physically deleted. Deactivated users MUST NOT log in.

**Scenarios**: Deactivate → `isActive=false`, HTTP 204, record remains; login attempt → HTTP 401.

### Requirement: Change User Role

Admin changes any user's role. MUST prevent removing Admin role from last Admin in tenant.

**Scenarios**: Change role (≥2 Admins) → HTTP 200; last Admin downgrade → HTTP 422 "Cannot remove the last Admin from a tenant".

### Requirement: User Management UI

Route `/users` gated to Admin. List view (PrimeNG Table: name, email, role, status) + dialog form (create/edit) + confirm dialog (deactivate). Non-Admin navigates to `/users` → redirected to `/home`.

---

## inventory-management (Delta)

### ADDED: Paginated Full Inventory List

`GET /api/v1/inventory` — paginated (`page`, `pageSize`), optional `search` (product name or SKU). Returns all items including zero-stock. Each item: `productName`, `currentStock`, `lastMovementDate`.

**Scenarios**: 45 items → page returns 20 + total 45; zero-stock product → included with `currentStock: 0`; search "ibu" → only matching product.

---

## app-shell-layout (Delta)

### MODIFIED: Route Protection (Frontend)

Interceptor MUST add `X-Tenant-Id` header on every `/api/**` request. Missing header → backend HTTP 400.

### MODIFIED: Sidebar Active Pill Style

Role-gated nav items MUST be conditionally rendered via `hasRole()` — NOT CSS-hidden. Reports visible to Admin + Pharmacist only. Users nav item visible to Admin only.

**New scenarios added**: Reports item absent for Cashier; Admin sees Reports + Users.

---

## dark-mode-toggle (Delta)

### MODIFIED: .dark-mode Class on html Element

`.dark-mode` block MUST define: `--text-color`, `--text-color-secondary`, `--brand-primary-subtle`. Removes dependency on hardcoded hex fallbacks in component SCSS.

### ADDED: No Hardcoded Color Fallbacks in Component SCSS

`app-header.component.scss` and `app-sidebar.component.scss` MUST NOT contain hardcoded hex literals in color declarations. All colors via CSS custom properties.

**Scenarios**: Header SCSS scan → no hex literals; Sidebar SCSS scan → no hex literals.
