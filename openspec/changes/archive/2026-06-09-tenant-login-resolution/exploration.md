# Exploration: tenant-login-resolution
_Date: 2026-06-08_

---

## Current State

The system has a fundamental **chicken-and-egg problem** at login time:

1. `TenantMiddleware` reads `X-Tenant-Id` from the request header and sets `tenantService.TenantId`.
2. `LoginCommandHandler` reads `tenantService.TenantId` (set in step 1) and calls `FindByEmailAndTenantAsync(email, tenantId)`.
3. `tenantInterceptor` (Angular) adds `X-Tenant-Id` to every request — but only if `authService.currentTenantId()` is non-null.
4. `currentTenantId` is a `computed(() => this._currentUser()?.tenantId ?? null)` — `_currentUser` is `null` until after a **successful login**.

**Result**: At login time, `currentTenantId()` is always `null` → the interceptor never sends `X-Tenant-Id` → `TenantMiddleware` never sets `tenantService.TenantId` → it stays `Guid.Empty` → `FindByEmailAndTenantAsync(email, Guid.Empty)` returns `null` → 401.

### Key schema facts
- `ApplicationUser.TenantId: Guid` — every user row has a hard FK to its tenant.
- `Tenant: { Id, Name, Slug, IsActive }` — slug is globally unique (unique index); name is not.
- Email uniqueness is **per-tenant**, not global — two tenants can both have `admin@demo.com`.
- `UserManagerService.FindByEmailAndTenantAsync` does: `WHERE Email = @email AND TenantId = @tenantId`.
- `TenantMiddleware` is already exempt for `/health` and `/swagger`; the login endpoint at `/api/v1/auth/login` is **not** exempt and is hit with no tenant context.
- `TenantMiddleware` is placed **before** `UseAuthentication` in `Program.cs`, so it runs before JWT claims are available (correct placement — but irrelevant for login).
- `CurrentTenantService` can also read `tenantId` from the **JWT claim** after authentication, but that only helps post-login requests — not login itself.
- The `DataSeeder` seeds one tenant ("Demo Pharmacy", slug "demo"). The `ExemptPaths` in `TenantMiddleware` do NOT include `/api/v1/auth/login`.
- Rate limiting policy `"auth"` applies to `/auth/login` and `/auth/register`: 100 req/min per IP.
- The `IPharmacyDbContext` interface uses `DbSet<TEntity> Set<TEntity>()`, so any query handler can query `Tenant` or `ApplicationUser` directly.

---

## Affected Areas

### Backend
- `src/backend/src/PharmacySystem.Api/Middleware/TenantMiddleware.cs` — currently does not exempt `/auth/login`; no fallback resolution
- `src/backend/src/PharmacySystem.Application/Identity/Commands/LoginCommand.cs` — handler must be extended to resolve tenant by email when `tenantId` is `Guid.Empty`
- `src/backend/src/PharmacySystem.Application/Identity/Commands/IUserManagerService.cs` — needs a new method `FindTenantsByEmailAsync`
- `src/backend/src/PharmacySystem.Infrastructure/Identity/UserManagerService.cs` — implements the new `FindTenantsByEmailAsync` method
- `src/backend/src/PharmacySystem.Application/Identity/DTOs/AuthDTOs.cs` — needs a `TenantSummaryDto` response DTO
- `src/backend/src/PharmacySystem.Api/Controllers/V1/AuthController.cs` — needs a new `GET /api/v1/tenants/by-email` endpoint

### Frontend
- `src/frontend/pharmacy-frontend/src/app/core/services/auth.service.ts` — needs `getTenantsByEmail()` method
- `src/frontend/pharmacy-frontend/src/app/core/models/auth.model.ts` — needs `TenantSummary` interface
- `src/frontend/pharmacy-frontend/src/app/features/auth/login.component.ts` — needs two-step flow: resolve tenant(s), then login
- `src/frontend/pharmacy-frontend/src/app/core/interceptors/tenant.interceptor.ts` — the interceptor itself is fine; the problem is upstream (no tenantId available at login time)

---

## Approaches

### 1. Backend-Driven Resolution (Proposed Option A — recommended)

**How it works:**
1. Add `GET /api/v1/tenants/by-email?email=...` → returns `[{ id, name, slug }]` (only active tenants, `[AllowAnonymous]`).
2. Modify `LoginCommandHandler`: if `tenantService.TenantId == Guid.Empty`, call `FindTenantsByEmailAsync(email)`:
   - 0 results → return 401 (same generic error — no user enumeration)
   - 1 result → auto-resolve: set `tenantService.TenantId` and proceed
   - 2+ results → return a new `TenantSelectionRequiredError` (HTTP 428 or 200 with a discriminated response)
3. Frontend two-step:
   - Step 1: user enters email → call `GET /tenants/by-email`
   - 1 tenant → store tentative `tenantId` in component state, proceed directly to login
   - 2+ tenants → show tenant picker → user selects → store in state → proceed to login
   - Step 2: login call includes `X-Tenant-Id` header (set manually for this request, not via interceptor — or store tenantId in `AuthService` signal before login)

- **Pros**: Pure backend fix for the single-tenant case; UX is seamless; consistent with existing `FindByEmailAndTenantAsync` contract; no changes to EF global query filters needed; interceptor pattern preserved for all post-login calls.
- **Cons**: New public endpoint exposes that an email is registered (tenant name disclosure). Needs small frontend refactor of `login.component.ts` to a two-step form flow.
- **Effort**: Medium (~120–160 lines total)

---

### 2. Exempt Login from TenantMiddleware + Resolve Inline (Minimal Backend)

**How it works:**
Add `/api/v1/auth/login` to `TenantMiddleware.ExemptPaths`, and modify `LoginCommandHandler` to directly query users by email across all tenants, auto-selecting if one match or returning a tenant list to the frontend.

- **Pros**: Fewer moving parts; no new controller endpoint.
- **Cons**: The handler already takes `ICurrentTenantService` to resolve tenantId — bypassing the middleware is the same as Approach 1 but less explicit. No real advantage over A. `ExemptPaths` approach bypasses ALL tenant middleware logic; could create issues if login ever needs the tenant context set before the handler runs.
- **Effort**: Low-Medium (~80–120 lines)

> **Assessment**: This is essentially the same as Option A but without the dedicated endpoint. Option A is cleaner because it separates tenant discovery from authentication, keeps each handler single-responsibility, and is easier to document/test independently.

---

### 3. Frontend-Only: Store Tenant Slug in localStorage Before Login

**How it works:**
Add a "select tenant" screen before login (e.g., user types their slug or selects from a public list), store `X-Tenant-Id` early, and then the interceptor sends it correctly.

- **Pros**: Zero backend changes.
- **Cons**: Requires users to know their tenant slug — terrible UX. Exposes tenant list publicly unless fetched. Doesn't solve the root problem for single-tenant users (they shouldn't need to do anything extra). Not viable for a production system.
- **Effort**: Low (code), High (UX debt)

---

## Recommendation

**Approach 1 (Backend-Driven Resolution)** with the following refinements from code analysis:

1. **New endpoint** `GET /api/v1/tenants/by-email?email=...`:
   - `[AllowAnonymous]` + `[EnableRateLimiting("auth")]` (reuse existing policy)
   - Returns `List<TenantSummaryDto>` — only `{ Id, Name, Slug }`, **never** emails/user counts
   - Only returns **active** (`IsActive = true`) tenants
   - Returns empty list (not 404) if no match — prevents user enumeration at tenant level

2. **`LoginCommandHandler` fallback resolution**:
   - When `tenantId == Guid.Empty`, call new `IUserManagerService.FindTenantsByEmailAsync(email)`
   - 0 tenants → 401 (generic "Invalid email or password" — same message, no new information)
   - 1 tenant → auto-inject into `tenantService.TenantId` and continue login
   - 2+ tenants → return a new `TenantSelectionRequiredError` with the tenant list payload

3. **Frontend two-step login**:
   - Email field triggers `getTenantsByEmail()` on blur (or on submit of step 1)
   - Single tenant: invisible to user — login proceeds as normal
   - Multiple tenants: dropdown/list selector appears before password field
   - On selection, store `pendingTenantId` as a signal in `AuthService`; the `tenantInterceptor` reads from it OR the login request sets `X-Tenant-Id` manually

   > Simplest approach for the interceptor: add a `pendingTenantId` writable signal to `AuthService` that the tenant picker sets pre-login. The `tenantInterceptor` already checks `authService.currentTenantId()` — we can extend this to also check `authService.pendingTenantId()` so the login POST automatically includes the header.

---

## Risks

1. **User/tenant enumeration**: `GET /tenants/by-email` tells an attacker which tenants a given email is registered in. Mitigation: rate-limit the endpoint (reuse `"auth"` policy), return identical timing for hit/miss (add artificial delay or normalize response time), and return only tenant name/slug — not user details.

2. **Single-tenant short-circuit in handler**: If we auto-resolve tenant in `LoginCommandHandler` and the middleware had set `tenantId` to something valid already (future scenario where another interceptor adds `X-Tenant-Id`), double-resolution could cause confusion. Mitigation: only run auto-resolve when `tenantId == Guid.Empty` (already the proposed condition).

3. **EF global query filter bypass**: `LoginCommandHandler` is in the Application layer. The new `FindTenantsByEmailAsync` queries `UserManager.Users` across all tenants — it must **not** be affected by EF global query filters that scope to `tenantService.TenantId`. Since `tenantId == Guid.Empty` at this point, the filter `WHERE TenantId = Guid.Empty` would return zero results. The implementation must call `IgnoreQueryFilters()` or query via raw `userManager.Users` which bypasses the global filter (check `PharmacyDbContext` global filter configuration). **This is a critical implementation detail.**

4. **Rate limiter on new endpoint**: The `"auth"` rate limiter policy is 100 req/min per IP. This is adequate for tenant discovery but the endpoint could be abused for email harvesting at scale. Consider a tighter policy for this specific endpoint (50 req/min).

5. **Multi-tenant `LoginCommandHandler` response shape**: Returning tenant list in a `TenantSelectionRequiredError` means the Application layer's `DomainError` hierarchy needs a new subtype with a payload (the tenant list). This is slightly non-standard for the Result pattern but justified. Alternatively, a separate `GET` endpoint (Option A) avoids changing `DomainError` entirely — the frontend calls the discovery endpoint independently before attempting login.

6. **`RegisterCommand` same bug**: `RegisterCommandHandler` also reads `tenantService.TenantId` and will fail the same way. This change should fix both, or at minimum document that `register` requires `X-Tenant-Id` (admin-only flow, less critical).

---

## Estimated Lines

| Area | Component | ~Lines |
|------|-----------|--------|
| Backend | `IUserManagerService` — add `FindTenantsByEmailAsync` | +5 |
| Backend | `UserManagerService` — implement method | +12 |
| Backend | `AuthDTOs.cs` — add `TenantSummaryDto` | +5 |
| Backend | `LoginCommandHandler` — fallback resolution logic | +20 |
| Backend | `AuthController` — new `GetTenantsByEmail` endpoint | +25 |
| Backend | (optional) new query `GetTenantsByEmailQuery` (CQRS pattern) | +35 |
| Frontend | `auth.model.ts` — `TenantSummary` interface | +5 |
| Frontend | `auth.service.ts` — `getTenantsByEmail()` + `pendingTenantId` signal | +15 |
| Frontend | `tenant.interceptor.ts` — read `pendingTenantId` | +5 |
| Frontend | `login.component.ts` — two-step UI | +60 |
| **Total** | | **~187 lines** |

> Budget assessment: ~187 lines is within the 400-line PR review budget. Single PR is viable.

---

## Ready for Proposal

**Yes.** The root cause is confirmed and fully traceable through the codebase. The proposed solution is coherent, fits the existing patterns (CQRS/MediatR, Result pattern, standalone Angular components with signals, manual DTO mapping, rate limiting), and introduces no breaking changes. The 400-line budget is not exceeded.

**Recommended next phase**: `sdd-propose` — create the formal proposal with rollback plan (per `config.yaml` rules).
