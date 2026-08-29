# Exploration: bug-fixes-and-user-mgmt

## Issue 1 — Reports sidebar filter (S)

### Current State
`AppSidebarComponent` injects `AuthService` and exposes `currentUser` (a readonly signal of `AuthUser | null`). The `AuthUser` model has a `roles: string[]` field. The sidebar HTML renders all four nav items (Catalog, Inventory, Sales, Reports) unconditionally — no role check on the Reports link.

`AuthService` does **not** have a `hasRole()` method. The only role-relevant surface is:
- `authService.currentUser()?.roles` — an array of strings on the signal value.

### Affected Areas
- `src/frontend/pharmacy-frontend/src/app/shared/components/app-sidebar/app-sidebar.component.html` — needs `*ngIf` on Reports `<li>`
- `src/frontend/pharmacy-frontend/src/app/core/services/auth.service.ts` — needs a `hasRole(role: string): boolean` computed helper (optional but clean)
- `src/frontend/pharmacy-frontend/src/app/core/models/auth.model.ts` — no change needed (`roles: string[]` already present)

### Approaches
1. **Inline check in template** — `*ngIf="currentUser()?.roles?.includes('Admin') || currentUser()?.roles?.includes('Pharmacist')"` directly in the HTML.
   - Pros: Zero new code, minimal surface.
   - Cons: Duplicates role logic in templates; harder to extend.
   - Effort: Low

2. **Add `hasRole()` computed to `AuthService`** — add `hasRole(role: string) => boolean` method backed by `this._currentUser()?.roles?.includes(role)`. Use it in template via `authService.hasRole('Pharmacist')`.
   - Pros: Reusable, consistent with existing pattern (`isAuthenticated` computed).
   - Cons: Tiny extra code.
   - Effort: Low

### Recommendation
Approach 2. The service already uses computed signals; `hasRole()` is a natural addition and prevents template-level role string duplication across future components.

### Root Cause
The `Reports` link in the sidebar is unconditionally rendered. `AuthService` lacks a `hasRole()` helper, so there is no clean integration point.

### Risks
- None significant. Pure UI guard — backend `ReportsController` is already gated by `PharmacistPolicy` (Admin + Pharmacist roles).

### Effort: S

---

## Issue 2 — User management feature (M)

### Current State
**Backend:**  
`UsersController` exposes only two endpoints:
- `GET /api/v1/users` — returns `IReadOnlyList<UserDto>` (Admin only)
- `GET /api/v1/users/me` — returns current user profile

Missing endpoints: create user, update user, deactivate user, change role.

Application layer has `GetUsersQuery` and `GetCurrentUserQuery` only. No commands exist for user mutation (create/update/deactivate/change-role). `IUserManagerService` does have `CreateUserAsync` and `AddToRoleAsync`, so the infrastructure capability is there.

`UserDto` has: `Id, Email, FirstName, LastName, FullName, Role (single string), TenantId`. Note: `UserDto.Role` is a single string — but `AuthUser.roles` on the frontend is `string[]`. This is a minor contract mismatch to watch.

**Frontend:**  
No user management feature module exists. Pattern reference (`product-list.component.ts`) shows: standalone component, PrimeNG Table with lazy loading + pagination, signal-based service state, filter bar, modal form via child component.

### Affected Areas
**Backend (new):**
- `src/backend/src/PharmacySystem.Application/Identity/Commands/` — new commands: `UpdateUserCommand`, `DeactivateUserCommand`, `ChangeUserRoleCommand`
- `src/backend/src/PharmacySystem.Api/Controllers/V1/UsersController.cs` — add `PUT /{id}`, `DELETE /{id}` (deactivate), `PUT /{id}/role`

**Frontend (new):**
- `src/frontend/pharmacy-frontend/src/app/features/users/` — new feature module
  - `user-list.component.ts` — table with pagination, role filter
  - `user-form.component.ts` — create/edit dialog
  - `services/user.service.ts` — HTTP client + signal state
  - `models/user.model.ts`
- Sidebar: add Users nav item (Admin-only)
- Routing: register `/users` route

### Approaches
1. **Full CRUD (create + update + deactivate + change role)** — implement all four missing operations end-to-end.
   - Pros: Complete feature.
   - Cons: More surface; change-role needs careful validation (can't remove last admin).
   - Effort: Medium

2. **Read + deactivate + change role only (no create)** — registration already exists via `/auth/register`. Focus on management operations.
   - Pros: Avoids duplicating registration logic; covers the real admin need.
   - Cons: Admin can't create users directly from the UI.
   - Effort: Small-Medium

### Recommendation
Approach 1 — full CRUD. Admin-initiated user creation is a real operational need. `IUserManagerService.CreateUserAsync` already exists; it's just wiring.

### Root Cause
No user management feature exists on either frontend or backend beyond listing and self-profile. The infrastructure-layer identity service already supports the operations — only application commands, controller endpoints, and frontend feature module are missing.

### Risks
- `UserDto.Role` is a single `string` while `AuthUser.roles` is `string[]` — align or document this contract difference before building the frontend model.
- Deactivation vs. deletion semantics need to be decided (soft-delete via `isActive` flag already present in Identity, based on `SoftDeleteInterceptor` pattern used elsewhere).
- "Change role" must guard against removing the last Admin in a tenant.

### Effort: M

---

## Issue 3 — GET /api/v1/inventory 404 (M)

### Current State
`InventoryController` registers the route `GET /api/v1/inventory` — but that route is mapped to `GetByProduct(Guid productId)` which requires a `{productId:guid}` segment. A plain `GET /api/v1/inventory` with no GUID segment hits no route → 404.

`InventoryService.loadStock()` calls `GET /api/v1/inventory` with `pageNumber`, `pageSize`, and optional `search` query params — expecting a paginated list response of `PagedResult<InventoryItem>`.

`InventoryQueries.cs` has:
- `GetInventoryItemQuery` — single item by productId
- `GetLowStockItemsQuery` — filtered low-stock list
- `GetMovementHistoryQuery` — movement history by productId

There is **no** `GetAllInventoryQuery` / paginated list query.

### Affected Areas
**Backend (new):**
- `src/backend/src/PharmacySystem.Application/Inventory/Queries/InventoryQueries.cs` — add `GetAllInventoryQuery(int Page, int PageSize, string? Search)` + handler
- `src/backend/src/PharmacySystem.Api/Controllers/V1/InventoryController.cs` — add `[HttpGet]` action (no route segment) calling `GetAllInventoryQuery`

**Frontend (no change needed):**
- `src/frontend/pharmacy-frontend/src/app/features/inventory/services/inventory.service.ts` — `loadStock()` already calls the right URL and maps the response correctly.

### Approaches
1. **Add `GetAllInventoryQuery` + `[HttpGet]` endpoint** — join `InventoryItem` with `Product`, support optional search by product name/SKU, return `PagedResult<InventoryItemDto>`.
   - Pros: Clean CQRS extension following existing patterns.
   - Cons: None significant.
   - Effort: Medium

### Recommendation
Only one viable approach. Follow the pattern of `GetLowStockItemsQuery` — join `InventoryItem` with `Product`, filter, paginate, return `PagedResult<InventoryItemDto>`.

### Root Cause
`GET /api/v1/inventory` (no segment) is not mapped in the controller. The only `[HttpGet]` actions require a GUID segment or a sub-path (`low-stock`). The application-layer query for a paginated full list was never created.

### Risks
- The `search` parameter in `loadStock()` sends `search` but the backend convention (product name? SKU? both?) needs to be specified.
- `InventoryItem` rows may not exist for every `Product` (new products with no stock movements). The query must decide whether to show zero-stock products (LEFT JOIN pattern) or only those with an `InventoryItem` record.

### Effort: M

---

## Issue 4 — GET /conflict-alerts 404 (S)

### Current State
`ConflictAlertsController` is correctly defined: `[Route("api/v{version:apiVersion}/conflict-alerts")]`, `[HttpGet]` gated by `PharmacistPolicy`.

`Program.cs` registers authorization policies in **`Infrastructure/DependencyInjection.cs`** (not Program.cs directly):
```
options.AddPolicy("AdminPolicy",      policy => policy.RequireRole("Admin"));
options.AddPolicy("PharmacistPolicy", policy => policy.RequireRole("Admin", "Pharmacist"));
```

Both policies ARE defined. The 404 is therefore **not** a policy issue.

The route is `api/v{version}/conflict-alerts`. The frontend is likely calling `/api/v1/conflict-alerts` — which should work given `AssumeDefaultVersionWhenUnspecified = true` in `Program.cs`.

Likely actual causes:
1. **Frontend service is calling the wrong URL** — e.g., `/conflict-alerts` without the `/api/v1/` prefix, or hitting a relative URL that doesn't match the API base.
2. **`GetConflictAlertsQuery` handler may be missing or not registered** — causing a runtime exception that manifests as 404 via `ToActionResult()`.

### Affected Areas
- `src/frontend/pharmacy-frontend/src/app/features/sales/services/` (or similar) — verify the URL used to call the endpoint
- `src/backend/src/PharmacySystem.Application/Sales/Queries/` — verify `GetConflictAlertsQuery` handler exists and is registered

### Root Cause (probable)
`PharmacistPolicy` IS defined correctly (Admin + Pharmacist roles). The 404 is most likely a frontend URL mismatch or a missing/unregistered MediatR handler for `GetConflictAlertsQuery`.

**Needs verification:** read the frontend service that calls this endpoint, and confirm `GetConflictAlertsQuery` handler exists in the Application layer.

### Risks
- If the handler is missing, also verify `ResolveConflictAlertCommand` handler exists.

### Effort: S (likely one-line URL fix or missing handler registration)

---

## Issue 5 — Dark mode not applied to sidebar/header/titles (S)

### Current State

**`styles.scss` — `.dark-mode` block defines:**
```scss
.dark-mode {
  --color-background: #0F172A;
  --color-card:       #1E293B;
  --color-border:     #334155;
  --color-foreground: #F1F5F9;  // defined but never used by components
}
```

**What's missing from `.dark-mode`:**
- `--color-primary` — not overridden (stays `#15803D`, fine on dark bg but could be adjusted)
- `--brand-primary-subtle` — not overridden (stays `#DCFCE7`, light green — will appear as bright patch in dark mode)
- `--text-color` / `--text-color-secondary` — not defined at all in `:root` (these are PrimeNG tokens, inherited from the theme); `.dark-mode` does not reassign them
- `--color-foreground` IS defined in `.dark-mode` but no component uses it — should be `--text-color` instead

**`app-sidebar.component.scss` — color issues:**
- `background: var(--color-card, var(--surface-card))` ✅ uses CSS var — will update with dark mode
- `border-right: 1px solid var(--color-border, var(--surface-border))` ✅
- `color: var(--text-color)` ✅ — but `--text-color` is a PrimeNG token not controlled by dark-mode class
- `.logout-btn:hover` background: `var(--red-50, #fff5f5)` — **hardcoded fallback `#fff5f5` is a light color**, will remain in dark mode if PrimeNG `--red-50` is also light
- `.nav-item.active` background: `var(--brand-primary-subtle)` — **`--brand-primary-subtle` not overridden in `.dark-mode`**, stays `#DCFCE7`

**`app-header.component.scss` — color issues:**
- `background: var(--color-card)` ✅
- `border-bottom: 1px solid var(--color-border)` ✅
- `color: var(--text-color, #1e293b)` — **hardcoded fallback `#1e293b`** is a dark-on-light value; in dark mode if `--text-color` is not set, text will be nearly invisible (dark text on dark background)
- `color: var(--text-color-secondary, #64748b)` — fallback `#64748b` is medium-contrast, tolerable but not ideal
- `color: var(--color-primary)` ✅
- `color: var(--text-color, #1e293b)` on theme-toggle button — same hardcoded fallback problem

### Affected Areas
- `src/frontend/pharmacy-frontend/src/styles.scss` — extend `.dark-mode` block with `--brand-primary-subtle`, `--text-color`, `--text-color-secondary`
- `src/frontend/pharmacy-frontend/src/app/shared/components/app-header/app-header.component.scss` — remove or replace hardcoded `#1e293b` fallbacks
- `src/frontend/pharmacy-frontend/src/app/shared/components/app-sidebar/app-sidebar.component.scss` — override `--brand-primary-subtle` in dark mode context, fix `.logout-btn:hover`
- Page titles (h2) use `color: var(--text-color)` from global styles — if PrimeNG theme token isn't updated when `.dark-mode` is toggled, titles stay dark

### Root Cause
`.dark-mode` class only overrides 3 tokens (`--color-background`, `--color-card`, `--color-border`). It does not override `--brand-primary-subtle`, `--text-color`, or `--text-color-secondary`. Components that fall back to hardcoded light-mode hex values (`#1e293b`, `#fff5f5`) will not respond to the dark-mode class. PrimeNG surface tokens are not wired to the custom dark-mode class at all.

### Risks
- PrimeNG theme tokens (`--text-color`, `--surface-hover`, `--red-50`, etc.) are controlled by PrimeNG's own theme — adding them to `.dark-mode` overrides them correctly only if `.dark-mode` is on `html` or `body` (which sets the cascade scope correctly). Verify where the class is applied.
- Full dark mode parity with PrimeNG components (dropdowns, tables, dialogs) requires either using a PrimeNG dark preset or systematically overriding all PrimeNG surface tokens — out of scope here, but worth noting.

### Effort: S

---

## Summary

| Issue | Root Cause Confirmed | Effort |
|---|---|---|
| 1 — Reports sidebar filter | `AuthService` has no `hasRole()` helper; Reports `<li>` unconditionally rendered | S |
| 2 — User management feature | No feature exists; backend has only GET list + GET me; no mutation commands | M |
| 3 — GET /inventory 404 | No `[HttpGet]` (plain list) action in controller; `GetAllInventoryQuery` missing | M |
| 4 — GET /conflict-alerts 404 | `PharmacistPolicy` IS defined correctly; root cause is frontend URL or missing handler — needs 1 more read | S |
| 5 — Dark mode sidebar/header | `.dark-mode` block too sparse; hardcoded fallback hex values bypass token overrides | S |

### Ready for Proposal
Yes for issues 1, 2, 3, 5. Issue 4 needs one additional read (frontend conflict-alerts service + Application query handler) to confirm exact root cause before proposal.
