# Verification Report: tenant-login-resolution

_Date: 2026-06-08 | Commit: 3db3754 (slice/8-polish) | Mode: Standard (no test runner)_

---

## Artifact Completeness

| Artifact | Present | Notes |
|----------|---------|-------|
| `spec.md` | ✅ | Full spec — 2 domains, 6 requirements, 13 scenarios |
| `design.md` | ✅ | Full design — data flow, contracts, security |
| `tasks.md` | ✅ | 13 tasks across 3 phases |
| Proposal | — | Not required for this change |

**Verification dimensions active:** task completeness ✅ · spec correctness ✅ · design coherence ✅

---

## Task Completeness

All 13 tasks are checked `[x]` in `tasks.md`. No unchecked implementation tasks.

| Phase | Task | Status |
|-------|------|--------|
| 1 | 1.1 `TenantSelectionRequiredError` + `TenantInfo` in `Result.cs` | ✅ |
| 1 | 1.2 `TenantSummaryDto` in `AuthDTOs.cs` | ✅ |
| 1 | 1.3 `FindTenantsByEmailAsync` in `IUserManagerService` | ✅ |
| 1 | 1.4 `UserManagerService.FindTenantsByEmailAsync` with `IgnoreQueryFilters()` | ✅ |
| 2 | 2.1 `GetTenantsByEmailQuery` + handler | ✅ |
| 2 | 2.2 `TenantSelectionRequiredError` → HTTP 422 in `ResultExtensions` | ✅ |
| 2 | 2.3 `GET /api/v{version}/tenants/by-email` anonymous + rate-limited | ✅ |
| 2 | 2.4 `LoginCommandHandler` 3-branch fallback (0→401, 1→auto-set, 2+→422) | ✅ |
| 2 | 2.5 `RegisterCommandHandler` same fallback | ✅ |
| 3 | 3.1 `TenantSummaryDto` interface in `auth.model.ts` | ✅ |
| 3 | 3.2 `_pendingTenantId` signal + `getTenantsByEmail()` + `logout()` clear | ✅ |
| 3 | 3.3 `tenantInterceptor` reads `pendingTenantId() ?? currentTenantId()` | ✅ |
| 3 | 3.4 `login.component.ts` two-step state machine | ✅ |

---

## Build Evidence

| Target | Command | Result |
|--------|---------|--------|
| Backend (.NET 10, Release) | `dotnet build --configuration Release --no-incremental` | ✅ 0 errors · 0 warnings |
| Frontend (Angular, production) | `npm run build -- --configuration production` | ✅ Bundle generated cleanly |

---

## Spec Compliance Matrix

Standard mode (no test runner). Evidence is source inspection. All `UNTESTED` items are marked as such per the project testing strategy (design.md: "All automated testing deferred to v2 per `openspec/config.yaml`").

### Domain: `tenant-discovery`

#### Requirement: Tenant Lookup by Email

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Single tenant found | `AuthController.GetTenantsByEmail` → `GetTenantsByEmailQuery` → `UserManagerService.FindTenantsByEmailAsync`; returns first matching tenant with `IsActive && !IsDeleted` filter | `UNTESTED` (source ✅) |
| Multiple tenants found | Same path; `Distinct()` on TenantIds then JOIN returns all matches | `UNTESTED` (source ✅) |
| Unknown email returns empty array | `if (tenantIds.Count == 0) return [];` → `Result.Success([])` → `OkObjectResult` | `UNTESTED` (source ✅) |
| Rate limit exceeded | `[EnableRateLimiting("auth")]` on `GetTenantsByEmail`; policy `"auth"` already registered | `UNTESTED` (source ✅) |

#### Requirement: Cross-Tenant Query Filter Bypass

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Email in non-current tenant included | `userManager.Users.IgnoreQueryFilters()` confirmed at line 86 of `UserManagerService.cs`; Tenants also uses `IgnoreQueryFilters()` at line 97 | `UNTESTED` (source ✅) |

#### Requirement: Response Data Minimization

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Response shape: `id, name, slug` only | `TenantSummaryDto(Guid Id, string Name, string Slug)` is the only projected type; no user data exposed | `UNTESTED` (source ✅) |

---

### Domain: `tenant-aware-login`

#### Requirement: Login Auto-Resolution for Single Tenant

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Single-tenant user, no header | `LoginCommandHandler`: `tenants.Count == 1` branch sets `tenantService.TenantId = tenants[0].Id; tenantId = tenants[0].Id` then falls through to normal auth | `UNTESTED` (source ✅) |
| Login with explicit header unaffected | `tenantId == Guid.Empty` guard; when header is present `TenantMiddleware` sets TenantId ≠ `Guid.Empty` → fallback block skipped | `UNTESTED` (source ✅) |

#### Requirement: Login Tenant Picker for Multi-Tenant Users

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Multi-tenant login without header → 422 | `tenants.Count > 1` branch returns `TenantSelectionRequiredError` → `ResultExtensions` maps to 422 with `Extensions["tenants"]` | `UNTESTED` (source ✅) |
| Multi-tenant user retries with selected tenant | When `X-Tenant-Id` is set by the frontend, `tenantId ≠ Guid.Empty` → normal flow | `UNTESTED` (source ✅) |

#### Requirement: Login Rejection for Unknown Email (No Tenant)

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Unknown email → 401 (generic) | `tenants.Count == 0` → `UnauthorizedError("Auth.InvalidCredentials", "Invalid email or password.")` — identical message to wrong-password branch | `UNTESTED` (source ✅) |

#### Requirement: Registration Tenant Auto-Resolution

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Single-tenant registration without header | `RegisterCommandHandler` mirrors `LoginCommandHandler` fallback exactly (lines 55–83) | `UNTESTED` (source ✅) |
| Unknown email during registration → 401 | Same `tenants.Count == 0` branch with identical `UnauthorizedError` | `UNTESTED` (source ✅) |

#### Requirement: Frontend Two-Step Login Flow

| Scenario | Implementation Evidence | Status |
|----------|------------------------|--------|
| Single-tenant, direct to password | `found.length === 1` → `setPendingTenantId(found[0].id)` → `state.set('awaitingPassword')` | `UNTESTED` (source ✅) |
| Multi-tenant, picker shown | `found.length > 1` → `tenants.set(found)` → `state.set('tenantPicker')`; `confirmTenant()` sets `pendingTenantId` | `UNTESTED` (source ✅) |
| Interceptor includes pendingTenantId | `tenantInterceptor`: `authService.pendingTenantId() ?? authService.currentTenantId()` at line 9 | `UNTESTED` (source ✅) |
| Unknown email → inline error, stay idle | `found.length === 0` → `errorMessage.set(...)` → `state.set('idle')` | `UNTESTED` (source ✅) |

---

## Design Coherence

| Decision | Design Says | Implementation | Status |
|----------|-------------|----------------|--------|
| `IgnoreQueryFilters()` in `UserManagerService` | Critical — must be called on `userManager.Users` | ✅ Line 86; also applied to `Tenants` JOIN at line 97 (bonus coverage) | ✅ COHERENT |
| `TenantSelectionRequiredError` → HTTP 422 | Before `_` fallthrough in switch | ✅ Lines 41–50 of `ResultExtensions.cs`; placed before `_` | ✅ COHERENT |
| `GetTenantsByEmailQuery` CQRS pattern | New query + handler, delegates to `IUserManagerService` | ✅ Matches design shape exactly; also adds a `FluentValidation` validator (bonus) | ✅ COHERENT |
| Anonymous endpoint + `[EnableRateLimiting("auth")]` | `GET /api/v1/tenants/by-email` — no `[Authorize]` | ✅ `[AllowAnonymous]` + `[EnableRateLimiting("auth")]` present | ✅ COHERENT |
| `pendingTenantId` signal in `AuthService` | Writable `signal<string \| null>(null)`, `asReadonly()` for interceptor, cleared on `logout()` | ✅ Lines 21–27, 42; public `setPendingTenantId()` helper added | ✅ COHERENT |
| Two-step state machine | `idle → resolvingTenant → tenantPicker → awaitingPassword → submitting` | ✅ All 5 states present; type alias `LoginState` declared at line 15 | ✅ COHERENT |
| `TenantSelectionRequiredError` uses `TenantInfo` not `TenantSummaryDto` | Design contract specifies `IReadOnlyList<TenantSummaryDto>` in `TenantSelectionRequiredError` | ⚠️ Implementation uses `TenantInfo` (Domain record) in `TenantSelectionRequiredError` + `TenantSummaryDto` (Application DTO) in `IUserManagerService`. Mapping occurs in command handlers. | ⚠️ DEVIATION |
| `pendingTenantId` cleared after success | Design says cleared on success/logout (open question) | ✅ Cleared in `submit().next()` + `logout()` | ✅ COHERENT |

---

## Issues

### CRITICAL
_None._

### WARNING

**W-01 — `TenantSelectionRequiredError` uses `TenantInfo` instead of `TenantSummaryDto`**
- **Design contract** (`design.md` line 107–110): `TenantSelectionRequiredError(string Code, string Message, IReadOnlyList<TenantSummaryDto> Tenants)` where `TenantSummaryDto` is the Application DTO.
- **Actual implementation**: `TenantSelectionRequiredError` holds `IReadOnlyList<TenantInfo>` where `TenantInfo` is a new Domain record `(Guid Id, string Name, string Slug)`. Handlers project `TenantSummaryDto` → `TenantInfo` when building the error.
- **Why this is a warning, not critical**: The contract is wire-compatible (`id/name/slug` shape is identical). `TenantInfo` lives in the Domain layer to avoid a Domain → Application DTO dependency — this is architecturally sound reasoning. The 422 response body is unaffected. The `ResultExtensions` serializes `tenantSelection.Tenants` correctly.
- **Recommendation**: Update the design doc to reflect the `TenantInfo` record and its rationale, OR migrate `TenantSelectionRequiredError.Tenants` to `TenantSummaryDto` and use `[JsonIgnore]`/mapping at the API layer if Domain purity is not the goal. Neither blocks the change.

**W-02 — `GetTenantsByEmailQuery` adds `FluentValidation` validator not in design**
- A `GetTenantsByEmailQueryValidator` was added (email format validation). This is a positive addition not mentioned in the design. Not a concern for correctness, but design.md should reflect it for future maintainers.

**W-03 — `setPendingTenantId()` public helper not in spec**
- `AuthService` exposes `setPendingTenantId(id: string | null)` as a public method. Spec 3.2 only required the signal + `pendingTenantId` readonly. The helper is necessary for the component to set the signal (since `_pendingTenantId` is private) — it's the correct pattern. Not a defect, but worth noting as a design gap.

### SUGGESTIONS

**S-01** — `goBack()` in `login.component.ts` clears `pendingTenantId` unconditionally (line 323). When navigating back from `awaitingPassword` to `tenantPicker`, the selection is lost and the user must re-pick. Consider only clearing on full back-to-idle, not on back-to-picker.

**S-02** — The open question in `design.md` (should `pendingTenantId` be cleared after a failed login?) is resolved in the implementation: it is NOT cleared on error (stays in `awaitingPassword`). This matches the recommendation in the open question. The question can be closed.

**S-03** — `GetTenantsByEmailQueryValidator` validates email format via FluentValidation, which means an invalid email format returns a 400 (validation error) instead of 200 with `[]`. The spec says unknown emails → 200 `[]`. An invalid email string is not a "known" vs "unknown" distinction — 400 for a malformed email is reasonable — but it's worth confirming this is intentional.

---

## Final Verdict

| Dimension | Result |
|-----------|--------|
| Task completeness (13/13) | ✅ PASS |
| Build — backend (0 errors, 0 warnings) | ✅ PASS |
| Build — frontend (production bundle clean) | ✅ PASS |
| Spec correctness (source evidence) | ✅ PASS (UNTESTED runtime — deferred to v2 per project config) |
| Design coherence | ⚠️ PASS WITH WARNINGS (W-01: `TenantInfo` vs `TenantSummaryDto` in error type) |

### **PASS WITH WARNINGS**

The change is archive-ready. The single design deviation (W-01) is architecturally sound and wire-compatible; it does not break any spec requirement or HTTP contract. No blocking issues found.
