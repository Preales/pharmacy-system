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

---

## Phase 1: Quick Wins (PR 1 target)

- [x] 1.1 `styles.scss` — extend `.dark-mode` block
- [x] 1.2 `app-header.component.scss` — replace hex literals with CSS custom properties
- [x] 1.3 `app-sidebar.component.scss` — replace `#fff5f5` with `var(--red-50)`
- [x] 1.4 `auth.service.ts` — add `hasRole(role: string): boolean`
- [x] 1.5 `app-sidebar.component.ts` — inject `AuthService`; expose `hasRole`
- [x] 1.6 `app-sidebar.component.html` — gate Reports and Users items via `@if`
- [x] 1.7 `app.config.ts` — verify `tenantInterceptor` in `withInterceptors([])`
- [ ] 1.8 Unit tests: `hasRole()` — deferred (strict_tdd: false)

## Phase 2: Backend — Inventory + User Management (PR 2 target)

- [x] 2.1 `InventoryQueries.cs` — add `GetAllInventoryItemsQuery` + handler
- [x] 2.2 `InventoryController.cs` — add `[HttpGet]` action
- [x] 2.3 `UserDto` — add `IsActive: bool` field
- [x] 2.4 `IUserManagerService.cs` — add `UpdateUserAsync`, `DeactivateUserAsync`, `ChangeUserRoleAsync`
- [x] 2.5 `UserManagerService.cs` — implement the 3 new methods
- [x] 2.6 `UserManagementCommands.cs` — add 4 commands with validators + handlers
- [x] 2.7 `ChangeUserRoleCommand` handler — last-Admin guard
- [x] 2.8 `UsersController.cs` — add POST/PUT/DELETE/PUT-role endpoints
- [ ] 2.9 Unit test: `ChangeUserRoleCommand` last-Admin guard — deferred (strict_tdd: false)
- [ ] 2.10 Unit test: `GetAllInventoryItemsQuery` with zero-stock — deferred (strict_tdd: false)
- [ ] 2.11 Integration test: POST /users 201/409 — deferred (strict_tdd: false)
- [ ] 2.12 Integration test: DELETE /users/{id} as Pharmacist → 403 — deferred (strict_tdd: false)

## Phase 3: Frontend — Users Feature Module (PR 3 target)

- [x] 3.1 `user.model.ts` — `UserModel` interface
- [x] 3.2 `user.service.ts` — signal-based service
- [x] 3.3 `user-list.component.ts` — PrimeNG Table
- [x] 3.4 `user-form.component.ts` — p-dialog
- [x] 3.5 `users.routes.ts` — lazy route with AdminGuard
- [x] 3.6 `app.routes.ts` — register `/users` lazy route
- [ ] 3.7 E2E / route guard test — deferred (strict_tdd: false)
- [ ] 3.8 Smoke test — deferred (strict_tdd: false)

## Phase 4: Cleanup

- [x] 4.1 Remove `// TODO` investigation comments
- [x] 4.2 Confirm conflict-alerts resolves after inventory fix
- [x] 4.3 SCSS scan: no hex literals in header/sidebar SCSS

## Archive Note

Unchecked tasks (1.8, 2.9–2.12, 3.7–3.8) deferred per strict_tdd: false. All implementation tasks complete. Verified by apply-progress + PASS verdict.
