# Tasks: Bug Fixes & User Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-always |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Quick wins: dark mode + sidebar role filter + interceptor check | PR 1 | Base: main; self-contained, no backend changes |
| 2 | Backend: GET /inventory + UserManagement commands + endpoints | PR 2 | Base: main (after PR 1 merges); additive only |
| 3 | Frontend: users feature module + sidebar admin item + routing | PR 3 | Base: main (after PR 2 merges); depends on PR 2 contracts |

---

## Phase 1: Quick Wins (PR 1 target)

- [x] 1.1 `styles.scss` — extend `.dark-mode` block: add `--text-color`, `--text-color-secondary`, `--brand-primary-subtle`
- [x] 1.2 `app-header.component.scss` — replace `#1e293b` / `#64748b` hex literals with `var(--text-color)` / `var(--text-color-secondary)`
- [x] 1.3 `app-sidebar.component.scss` — replace `#fff5f5` with `var(--red-50)` on `.logout-btn:hover`
- [x] 1.4 `auth.service.ts` — add `hasRole(role: string): boolean` method backed by `_currentUser()?.roles?.includes(role) ?? false`
- [x] 1.5 `app-sidebar.component.ts` — inject `AuthService`; expose `hasRole` to template
- [x] 1.6 `app-sidebar.component.html` — gate Reports item with `@if(hasRole('Admin') || hasRole('Pharmacist'))`; gate Users item with `@if(hasRole('Admin'))`
- [x] 1.7 `app.config.ts` — verified `tenantInterceptor` already present in `withInterceptors([])` array; no code change needed
- [ ] 1.8 Unit tests: `hasRole()` — role present, role absent, null user (Jest/Jasmine)

## Phase 2: Backend — Inventory + User Management (PR 2 target)

- [x] 2.1 `InventoryQueries.cs` — add `GetAllInventoryItemsQuery(Page, PageSize, Search?)` + handler; LEFT JOIN `InventoryItem ← Product`; return `PagedResult<InventoryItemDto>` including zero-stock items
- [x] 2.2 `InventoryController.cs` — add `[HttpGet]` action, wires to `GetAllInventoryItemsQuery`
- [x] 2.3 `UserDto` (backend) — add `IsActive: bool` field
- [x] 2.4 `IUserManagerService.cs` — add `UpdateUserAsync`, `DeactivateUserAsync`, `ChangeUserRoleAsync` signatures
- [x] 2.5 `UserManagerService.cs` — implement the 3 new interface methods
- [x] 2.6 `Identity/Commands/UserManagementCommands.cs` (new file) — add `CreateUserCommand`, `UpdateUserCommand`, `DeactivateUserCommand`, `ChangeUserRoleCommand`; each with FluentValidation validator + `IRequestHandler`
- [x] 2.7 `ChangeUserRoleCommand` handler — add last-Admin guard; return HTTP 422 with message when tenant has only one Admin
- [x] 2.8 `UsersController.cs` — add `POST /api/v1/users` (201/409), `PUT /{id}` (200), `DELETE /{id}` (204), `PUT /{id}/role` (200/422); all Admin-only, tenant-scoped
- [ ] 2.9 Unit test: `ChangeUserRoleCommand` last-Admin guard (xUnit, mock `IUserManagerService`, 1 Admin in tenant)
- [ ] 2.10 Unit test: `GetAllInventoryItemsQuery` with zero-stock product (xUnit, in-memory EF)
- [ ] 2.11 Integration test: `POST /users` → 201 + duplicate email → 409 (WebApplicationFactory)
- [ ] 2.12 Integration test: `DELETE /users/{id}` as Pharmacist → 403

## Phase 3: Frontend — Users Feature Module (PR 3 target)

- [x] 3.1 `user.model.ts` (new) — `UserModel` interface (`id`, `email`, `firstName`, `lastName`, `fullName`, `role: string`, `tenantId`, `isActive: boolean`)
- [x] 3.2 `user.service.ts` (new) — signal-based: `loadAll(page, role?, isActive?)`, `create()`, `update()`, `deactivate()`, `changeRole()`; state: `PagedResult<UserModel>`
- [x] 3.3 `user-list.component.ts` (new) — PrimeNG Table: columns name, email, role, status; edit + deactivate action buttons; mirrors `category-list` pattern
- [x] 3.4 `user-form.component.ts` (new) — p-dialog; fields: firstName, lastName, role (dropdown: Admin/Pharmacist/Cashier); email read-only on edit
- [x] 3.5 `users.routes.ts` (new) — lazy route `/users` with `AdminGuard` (redirect non-Admin to `/home`)
- [x] 3.6 `app.routes.ts` — register `/users` lazy route
- [ ] 3.7 E2E / route guard test: non-Admin navigates to `/users` → redirected to `/home`
- [ ] 3.8 Smoke test: Admin creates user via dialog → list refreshes with new entry

## Phase 4: Cleanup

- [x] 4.1 Remove any `// TODO` or investigation comments added during conflict-alerts debugging
- [x] 4.2 Confirm `GET /api/v1/conflict-alerts` resolves after inventory fix (tenantInterceptor + correct endpoint); close Issue 4 notes
- [x] 4.3 SCSS scan: assert no hex literals remain in `app-header.component.scss` and `app-sidebar.component.scss`
