# Proposal: Bug Fixes & User Management

## Intent

Five confirmed issues degrade system reliability and completeness: two 404 API errors block core workflows, the sidebar exposes a restricted feature to all roles, dark mode is cosmetically broken for half the UI, and user management is entirely absent. This change restores correctness and delivers the first complete admin workflow.

## Scope

### In Scope
- Add `hasRole()` to `AuthService`; gate Reports sidebar item to Admin + Pharmacist
- Full user management CRUD: list, create, edit, deactivate, change role (Admin-only)
- Fix `GET /api/v1/inventory` 404: `GetAllInventoryQuery` + handler + `[HttpGet]` endpoint
- Fix `GET /api/v1/conflict-alerts` 404: diagnose and resolve frontend URL or missing MediatR handler
- Extend `.dark-mode` token block; fix hardcoded color fallbacks in header/sidebar SCSS

### Out of Scope
- Full PrimeNG dark preset integration (dropdowns, dialogs, tables)
- User registration flow changes (existing `/auth/register` unchanged)
- Role hierarchy changes or new roles
- Bulk user operations

## Capabilities

### New Capabilities
- `user-management`: Admin CRUD for users — list, create, edit, deactivate, change role. Includes backend commands + endpoints and a new `/features/users/` frontend module.

### Modified Capabilities
- `identity-auth`: Add `hasRole()` helper to `AuthService`; add route guard and sidebar filter for Reports. Add `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}` (deactivate), `PUT /users/{id}/role` endpoints. Reconcile `UserDto.Role` (string) vs `AuthUser.roles` (string[]) contract.
- `inventory-management`: Add `GetAllInventoryQuery` + handler + `GET /api/v1/inventory` paginated endpoint (no frontend change needed).
- `app-shell-layout`: Sidebar gains Admin-only Users nav item and role-gated Reports item.
- `dark-mode-toggle`: Extend `.dark-mode` block with missing tokens; fix hardcoded fallback hex values in header and sidebar SCSS.

## Approach

- **Issue 1 & sidebar Users item**: Add `hasRole(role: string): boolean` method to `AuthService` backed by `this._currentUser()?.roles?.includes(role)`. Apply `*ngIf` guards in `app-sidebar.component.html`.
- **Issue 2**: Backend — add `UpdateUserCommand`, `DeactivateUserCommand`, `ChangeUserRoleCommand` following existing CQRS pattern; add 3 endpoints to `UsersController`. Frontend — new `features/users/` module (standalone components, PrimeNG Table, signal state). Align user model: expose `role: string` on frontend `UserModel` mapped from `UserDto.Role`; keep `AuthUser.roles: string[]` unchanged.
- **Issue 3**: Add `GetAllInventoryQuery(Page, PageSize, Search?)` + handler following `GetLowStockItemsQuery` pattern; add plain `[HttpGet]` action to `InventoryController`. Search covers product name and SKU; zero-stock products included via LEFT JOIN pattern.
- **Issue 4**: Read frontend conflict-alerts service and `GetConflictAlertsQuery` handler; fix URL or register missing handler.
- **Issue 5**: Add `--brand-primary-subtle` (dark override), `--text-color`, `--text-color-secondary` to `.dark-mode` block in `styles.scss`. Replace `#1e293b` and `#fff5f5` hardcoded fallbacks in header/sidebar SCSS with dark-safe values.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/core/services/auth.service.ts` | Modified | Add `hasRole()` method |
| `src/app/shared/components/app-sidebar/app-sidebar.component.html` | Modified | Role-gate Reports and Users nav items |
| `src/app/features/users/` | New | Full user management feature module |
| `PharmacySystem.Application/Identity/Commands/` | New | UpdateUser, DeactivateUser, ChangeUserRole commands |
| `PharmacySystem.Api/Controllers/V1/UsersController.cs` | Modified | Add 3 mutation endpoints |
| `PharmacySystem.Application/Inventory/Queries/InventoryQueries.cs` | Modified | Add GetAllInventoryQuery + handler |
| `PharmacySystem.Api/Controllers/V1/InventoryController.cs` | Modified | Add plain [HttpGet] action |
| `src/app/features/sales/services/` | Modified | Fix conflict-alerts URL or handler registration |
| `src/styles.scss` | Modified | Extend .dark-mode token block |
| `app-header.component.scss` / `app-sidebar.component.scss` | Modified | Remove hardcoded fallback hex values |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `ChangeUserRoleCommand` removes last Admin in tenant | Med | Guard: validate ≥1 Admin remains before role change |
| Deactivation vs deletion semantics unclear | Low | Use soft-delete via `isActive` flag (pattern already present) |
| `.dark-mode` token overrides don't cover all PrimeNG surface tokens | Low | Out of scope; document known gaps in spec |
| Issue 4 root cause not yet confirmed | Med | Add investigation step as first task; block other Issue 4 tasks on result |

## Rollback Plan

- Backend: all new commands/endpoints are additive. Rollback = revert commits; existing endpoints unaffected.
- Frontend users module: route is new; removing it does not break existing routes.
- Dark mode: SCSS-only changes. Revert styles.scss and component SCSS files.
- Issue 4: fix is targeted (URL or handler); revert the single file changed.

## Dependencies

- `IUserManagerService.CreateUserAsync` and `AddToRoleAsync` already exist in Infrastructure — no new infrastructure dependency.
- PrimeNG Aura dark preset wiring (for full component dark mode) is a known gap but out of scope.

## Success Criteria

- [ ] Reports nav item is hidden for Clerk role; visible for Admin and Pharmacist
- [ ] Admin can create, edit, deactivate, and change the role of any user in their tenant
- [ ] `GET /api/v1/inventory` returns paginated results; Inventory page loads without 404
- [ ] `GET /api/v1/conflict-alerts` returns data; Sales conflict alert UI renders
- [ ] Dark mode applies correct text and accent colors to sidebar, header, and page titles
- [ ] Last Admin in a tenant cannot have their Admin role removed
