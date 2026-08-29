# Design: Bug Fixes & User Management

## Technical Approach

Implement five targeted fixes using the existing CQRS + signal patterns already present in the codebase. Backend follows the `CategoryCommands.cs` + `InventoryQueries.cs` pattern (record commands, FluentValidation, `IRequestHandler`). Frontend follows the `category-list` / `category.service.ts` pattern (signals, standalone components, PrimeNG Table + Dialog).

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| `hasRole()` on `AuthService` | `computed(() => this._currentUser()?.roles?.includes(role))` as a method | Pipe or directive | `AuthService` already owns the signal; computed method is the lightest extension |
| Sidebar role gates | `*ngIf="authService.hasRole('Admin')"` — remove DOM node | CSS hidden | Spec requires DOM removal to prevent role enumeration |
| User mutations: new `Commands/UserManagementCommands.cs` file | New file in `Identity/Commands/` | Extend existing auth commands | Keeps auth (login/register) and admin CRUD separated; mirrors Catalog split |
| `IUserManagerService` extensions | Add `UpdateUserAsync`, `DeactivateUserAsync`, `ChangeUserRoleAsync` to interface | Bypass interface; use `UserManager` directly in handler | Application layer must not depend on Infrastructure; interface is the existing anti-corruption pattern |
| Conflict-alerts fix | Add `X-Tenant-Id` via **existing `tenantInterceptor`** — it already exists and is correct | New interceptor | `tenant.interceptor.ts` already handles it; diagnose if it's registered in `app.config.ts` |
| Inventory GET all | New `GetAllInventoryItemsQuery` + `[HttpGet]` action on `InventoryController` | N/A — missing endpoint | Pure addition; zero risk to existing actions |
| Dark mode tokens | Extend `.dark-mode` block in `styles.scss`; remove `#1e293b` / `#64748b` fallback hex literals from header SCSS | Override per-component | Central token block is the established pattern; components MUST use custom properties |

---

## Data Flow

### Issue 1 — Role-gated sidebar
```
AppSidebarComponent
  └── injects AuthService
        └── hasRole('Admin' | 'Pharmacist') : boolean
              └── _currentUser() signal → roles[]  →  *ngIf in template
```

### Issue 2 — User Management CRUD
```
Admin UI (UserListComponent)
  ├── UserService.loadAll()  →  GET /api/v1/users        →  GetUsersQuery (existing)
  ├── UserService.create()   →  POST /api/v1/users       →  CreateUserCommand (new)
  ├── UserService.update()   →  PUT /api/v1/users/{id}   →  UpdateUserCommand (new)
  ├── UserService.deactivate() → DELETE /api/v1/users/{id} → DeactivateUserCommand (new)
  └── UserService.changeRole() → PUT /api/v1/users/{id}/role → ChangeUserRoleCommand (new)

Handler layer:
  CreateUserCommand  →  IUserManagerService.CreateUserAsync() + AddToRoleAsync()
  DeactivateUserCommand → IUserManagerService.DeactivateUserAsync() (sets isActive=false)
  ChangeUserRoleCommand → guard last-Admin check → IUserManagerService.ChangeUserRoleAsync()
```

### Issue 3 — GET /api/v1/inventory
```
InventoryController.[HttpGet]
  └── GetAllInventoryItemsQuery(Page, PageSize, Search?)
        └── LEFT JOIN InventoryItem ← Product
              → PagedResult<InventoryItemDto>
```
Pattern mirrors `GetLowStockItemsQuery` — separate product dictionary lookup, no navigation property required.

### Issue 4 — Conflict-alerts 404
```
ConflictAlertsService  →  GET ${apiBaseUrl}/conflict-alerts
  └── tenantInterceptor adds X-Tenant-Id header
        └── ConflictAlertsController.[HttpGet]  (already exists — route correct)

Root cause: verify tenantInterceptor is in withInterceptors([]) array in app.config.ts
```

### Issue 5 — Dark mode SCSS
```
styles.scss .dark-mode block
  ├── add: --brand-primary-subtle, --text-color, --text-color-secondary
  └── components read via var(--text-color) — no hex fallback
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/core/services/auth.service.ts` | Modify | Add `hasRole(role: string): boolean` method |
| `src/app/shared/components/app-sidebar/app-sidebar.component.html` | Modify | `*ngIf` gates for Reports (Admin+Pharmacist) and Users (Admin) |
| `src/app/shared/components/app-sidebar/app-sidebar.component.ts` | Modify | Inject `AuthService`, expose to template |
| `src/app/features/users/models/user.model.ts` | Create | `UserModel` interface with `role: string` (mapped from `UserDto.Role`) |
| `src/app/features/users/services/user.service.ts` | Create | Signal-based service — CRUD + `PagedResult<UserModel>` state |
| `src/app/features/users/containers/user-list.component.ts` | Create | PrimeNG Table, matches `category-list` pattern |
| `src/app/features/users/containers/user-form.component.ts` | Create | p-dialog form — create/edit (name, role); email read-only on edit |
| `src/app/features/users/users.routes.ts` | Create | Lazy route for `/users`, Admin-only guard |
| `src/app/app.routes.ts` | Modify | Register `/users` lazy route |
| `src/backend/.../Identity/Commands/UserManagementCommands.cs` | Create | `CreateUserCommand`, `UpdateUserCommand`, `DeactivateUserCommand`, `ChangeUserRoleCommand` + validators + handlers |
| `src/backend/.../Identity/Commands/IUserManagerService.cs` | Modify | Add `UpdateUserAsync`, `DeactivateUserAsync`, `ChangeUserRoleAsync` |
| `src/backend/.../Infrastructure/Identity/UserManagerService.cs` | Modify | Implement the 3 new interface methods |
| `src/backend/.../Controllers/V1/UsersController.cs` | Modify | Add POST, PUT `/{id}`, DELETE `/{id}`, PUT `/{id}/role` endpoints |
| `src/backend/.../Inventory/Queries/InventoryQueries.cs` | Modify | Add `GetAllInventoryItemsQuery` + handler |
| `src/backend/.../Controllers/V1/InventoryController.cs` | Modify | Add `[HttpGet]` action (paginated, optional search) |
| `src/frontend/.../app.config.ts` | Modify | Confirm `tenantInterceptor` in `withInterceptors([])` — add if missing |
| `src/styles.scss` | Modify | Extend `.dark-mode` block with `--brand-primary-subtle`, `--text-color`, `--text-color-secondary` |
| `src/app/shared/components/app-header/app-header.component.scss` | Modify | Remove `#1e293b` and `#64748b` hex fallbacks; use `var(--text-color)` / `var(--text-color-secondary)` |
| `src/app/shared/components/app-sidebar/app-sidebar.component.scss` | Modify | Remove `#fff5f5` hex fallback on `.logout-btn:hover`; use `var(--red-50)` only |

---

## Interfaces / Contracts

```typescript
// auth.service.ts — new method
hasRole(role: string): boolean {
  return this._currentUser()?.roles?.includes(role) ?? false;
}
```

```typescript
// user.model.ts
export interface UserModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;        // from UserDto.Role — NOT AuthUser.roles[]
  tenantId: string;
  isActive: boolean;
}
```

```csharp
// UserManagementCommands.cs (backend)
public record CreateUserCommand(
    string Email, string FirstName, string LastName, string Role) : IRequest<Result<UserDto>>;

public record UpdateUserCommand(
    string UserId, string FirstName, string LastName) : IRequest<Result<UserDto>>;

public record DeactivateUserCommand(string UserId) : IRequest<Result<bool>>;

public record ChangeUserRoleCommand(
    string UserId, string NewRole) : IRequest<Result<UserDto>>;
```

```csharp
// IUserManagerService.cs — additions
Task<(IdentityResultWrapper result, string userId)> UpdateUserAsync(
    string userId, string firstName, string lastName);
Task<IdentityResultWrapper> DeactivateUserAsync(string userId);
Task<IdentityResultWrapper> ChangeUserRoleAsync(string userId, string newRole);
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `hasRole()` — present, absent, null user | Jest / Jasmine, direct service instantiation |
| Unit | `ChangeUserRoleCommand` last-Admin guard | xUnit, mock `IUserManagerService`, inject 1 Admin tenant |
| Unit | `GetAllInventoryItemsQuery` with zero-stock products | xUnit, in-memory EF context |
| Integration | POST `/users` — 201 + 409 (duplicate email) | WebApplicationFactory + real DB |
| Integration | DELETE `/users/{id}` — Pharmacist gets 403 | WebApplicationFactory |
| E2E | `/users` route redirects non-Admin | Angular Testing Library or Cypress |

---

## Migration / Rollout

No migration required. All backend changes are additive (new endpoints + new command file). `isActive` flag already exists on `ApplicationUser`. Frontend `/users` route is new; removing it does not affect existing routes.

---

## Open Questions

- [ ] Confirm `tenantInterceptor` registration in `app.config.ts` — if already registered, Issue 4 has a different root cause (e.g., `apiBaseUrl` path mismatch). **Block Issue 4 tasks until confirmed.**
- [ ] `UserModel.isActive` — backend `UserDto` does not yet expose `isActive`. Decide: extend `UserDto` or create a new `UserListItemDto`. Recommended: extend `UserDto`.
