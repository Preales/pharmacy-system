# Proposal: Tenant Login Resolution

_Date: 2026-06-08_

---

## Intent

Login and registration always return 401 because `tenantInterceptor` requires a logged-in user to know `tenantId`, but login requires `tenantId` to find the user — a chicken-and-egg deadlock. This change breaks the deadlock by introducing a pre-login tenant discovery step, making the system functional for both single-tenant and multi-tenant deployments.

## Scope

### In Scope
- New endpoint `GET /api/v1/tenants/by-email?email=...` (anonymous, rate-limited)
- `LoginCommandHandler` fallback: auto-resolve tenant when `tenantId == Guid.Empty`
- `RegisterCommandHandler` same fix (same root cause)
- `pendingTenantId` writable signal in `AuthService`; `tenantInterceptor` reads it
- Two-step login UI in `login.component.ts`: email → tenant resolution → credentials

### Out of Scope
- Tenant slug-based login (user types slug manually)
- Admin-managed tenant switching post-login
- Automated tests (deferred to v2 per project config)
- Tighter per-endpoint rate limit policy (deferred — existing `"auth"` policy is adequate for now)

---

## Capabilities

> Contract for sdd-spec: `openspec/specs/` is currently empty — all capabilities below are new.

### New Capabilities
- `tenant-discovery`: `GET /api/v1/tenants/by-email` — cross-tenant lookup returning `[{id, name, slug}]` for a given email; `IgnoreQueryFilters()` required; anonymous + rate-limited
- `tenant-aware-login`: Login flow that resolves tenantId pre-authentication — auto-proceeds for 1 tenant, shows picker for 2+, returns 401 for 0

### Modified Capabilities
- None

---

## Approach

**Backend:**
1. Add `TenantSummaryDto { Id, Name, Slug }` to `AuthDTOs.cs`
2. Add `FindTenantsByEmailAsync(email)` to `IUserManagerService` + `UserManagerService` (uses `IgnoreQueryFilters()`)
3. New `GetTenantsByEmailQuery` + handler (CQRS pattern) querying active tenants by user email
4. `AuthController.GetTenantsByEmail` — `[AllowAnonymous]`, `[EnableRateLimiting("auth")]`, returns `List<TenantSummaryDto>`
5. `LoginCommandHandler` + `RegisterCommandHandler`: when `tenantService.TenantId == Guid.Empty`, invoke `FindTenantsByEmailAsync` → 0 → 401 | 1 → auto-inject | 2+ → `TenantSelectionRequiredError`

**Frontend:**
1. `TenantSummary` interface in `auth.model.ts`
2. `getTenantsByEmail()` method + `pendingTenantId` writable signal in `auth.service.ts`
3. `tenantInterceptor` extended: reads `pendingTenantId() ?? currentTenantId()`
4. `login.component.ts` refactored to two-step: step 1 resolves tenants on email blur; step 2 shows picker or proceeds directly

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/backend/.../Application/Identity/DTOs/AuthDTOs.cs` | Modified | Add `TenantSummaryDto` |
| `src/backend/.../Application/Identity/Commands/IUserManagerService.cs` | Modified | Add `FindTenantsByEmailAsync` |
| `src/backend/.../Infrastructure/Identity/UserManagerService.cs` | Modified | Implement with `IgnoreQueryFilters()` |
| `src/backend/.../Application/Identity/Commands/LoginCommand.cs` | Modified | Fallback tenant resolution |
| `src/backend/.../Application/Identity/Commands/RegisterCommand.cs` | Modified | Same fallback fix |
| `src/backend/.../Api/Controllers/V1/AuthController.cs` | Modified | New `GetTenantsByEmail` endpoint |
| `src/frontend/.../core/models/auth.model.ts` | Modified | Add `TenantSummary` interface |
| `src/frontend/.../core/services/auth.service.ts` | Modified | `getTenantsByEmail()` + `pendingTenantId` signal |
| `src/frontend/.../core/interceptors/tenant.interceptor.ts` | Modified | Read `pendingTenantId` |
| `src/frontend/.../features/auth/login.component.ts` | Modified | Two-step login flow |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Email/tenant enumeration via new endpoint | Med | Rate limit (`"auth"` 100/min), return only `name/slug`, identical timing for hit/miss |
| EF global query filter returns 0 results for cross-tenant queries | High | `IgnoreQueryFilters()` required — critical implementation detail |
| Double-resolution if `X-Tenant-Id` ever arrives before handler runs | Low | Guard: only resolve when `tenantId == Guid.Empty` |
| `RegisterCommand` fix omitted, leaving partial fix | Med | Treat both handlers as a single unit in the same PR |

---

## Rollback Plan

All changes are additive or guarded by `tenantId == Guid.Empty`:
1. Revert the PR (single PR — ~187 lines)
2. The new endpoint can be disabled independently by removing `[AllowAnonymous]` or adding to `ExemptPaths` with a redirect to 404
3. `LoginCommandHandler` fallback is a guarded code path — removing the `if (tenantId == Guid.Empty)` block restores prior behavior
4. Frontend: revert `login.component.ts` to single-step form; remove `pendingTenantId` signal

No database migrations required. No data model changes. Rollback is safe at any point.

---

## Dependencies

- Existing `"auth"` rate limiter policy must be registered in `Program.cs` (confirmed present)
- EF `IgnoreQueryFilters()` must be available on the `UserManager.Users` queryable (confirmed via `IPharmacyDbContext.Set<TEntity>()`)

---

## Success Criteria

- [ ] A user with a single tenant can log in without providing `X-Tenant-Id` manually
- [ ] A user belonging to 2+ tenants sees a tenant picker and can complete login after selecting
- [ ] An unknown email returns 401 with the same generic message — no new information disclosed
- [ ] `GET /api/v1/tenants/by-email` returns only active tenants, only `{id, name, slug}`, with a 200 and empty array for unknown emails
- [ ] Registration (`POST /auth/register`) works without a pre-existing `X-Tenant-Id` header (same fix applied)
- [ ] `dotnet build src/backend/PharmacySystem.sln` passes with no errors
