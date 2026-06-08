# Tasks: Tenant Login Resolution

_Change: `tenant-login-resolution` | Date: 2026-06-08_

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~187 (13 files, all additive) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full tenant-login-resolution | PR 1 | All 13 files; ~187 lines; within 400-line budget |

---

## Phase 1: Backend Foundation

- [x] 1.1 `PharmacySystem.Domain/Common/Result.cs` — add `TenantSelectionRequiredError(Code, Message, Tenants)` record inheriting `DomainError`. Done when: file compiles; type is visible from Application layer.
- [x] 1.2 `PharmacySystem.Application/Identity/DTOs/AuthDTOs.cs` — add `TenantSummaryDto(Guid Id, string Name, string Slug)` record. Done when: record is public and usable in query/command handlers.
- [x] 1.3 `PharmacySystem.Application/Identity/Commands/IUserManagerService.cs` — add method signature `Task<IReadOnlyList<TenantSummaryDto>> FindTenantsByEmailAsync(string email)`. Done when: interface compiles with new method.
- [x] 1.4 `PharmacySystem.Infrastructure/Identity/UserManagerService.cs` — implement `FindTenantsByEmailAsync`: call `userManager.Users.IgnoreQueryFilters().Where(u => u.Email == email && u.TenantId != Guid.Empty).Select(u => u.TenantId).Distinct()`, then JOIN active `Tenants`, project to `TenantSummaryDto`. Done when: method returns correct list for a cross-tenant email; returns empty list for unknown email.

---

## Phase 2: Backend API

- [x] 2.1 `PharmacySystem.Application/Identity/Queries/GetTenantsByEmailQuery.cs` — CREATE new file with `GetTenantsByEmailQuery(string Email) : IRequest<Result<IReadOnlyList<TenantSummaryDto>>>` and its handler delegating to `IUserManagerService.FindTenantsByEmailAsync`. Done when: MediatR resolves the handler; returns `Result.Success(tenants)`.
- [x] 2.2 `PharmacySystem.Api/Extensions/ResultExtensions.cs` — add `TenantSelectionRequiredError` → HTTP 422 case in `ToActionResult` switch expression, returning `ObjectResult(ProblemDetails { Status=422, Extensions["tenants"]=tenants })`. Place before `_` fallthrough. Done when: a `TenantSelectionRequiredError` result maps to 422 with the `tenants` extension in the response body.
- [x] 2.3 `PharmacySystem.Api/Controllers/V1/AuthController.cs` — add `[HttpGet("/api/v1/tenants/by-email")]` anonymous endpoint `GetTenantsByEmail([FromQuery] string email)` that dispatches `GetTenantsByEmailQuery` and returns `ToActionResult`. Apply `[EnableRateLimiting("auth")]`. Done when: `GET /api/v1/tenants/by-email?email=x` returns 200 with array (or empty array); 429 when rate-limited.
- [x] 2.4 `PharmacySystem.Application/Identity/Commands/LoginCommand.cs` — add fallback branch: when `tenantId == Guid.Empty`, call `FindTenantsByEmailAsync(email)` → 0 results: return 401 generic; 1 result: set `tenantId` and continue; 2+ results: return `TenantSelectionRequiredError`. Done when: three branch outcomes are reachable and return correct HTTP status.
- [x] 2.5 `PharmacySystem.Application/Identity/Commands/RegisterCommand.cs` — add same `Guid.Empty` fallback as 2.4 (0→401, 1→auto-set, 2+→422). Done when: registration without `X-Tenant-Id` resolves correctly for single-tenant email; returns 401 for unknown email.

---

## Phase 3: Frontend

- [x] 3.1 `core/models/auth.model.ts` — add `export interface TenantSummaryDto { id: string; name: string; slug: string; }`. Done when: interface is exported and importable from services and components.
- [x] 3.2 `core/services/auth.service.ts` — add `private _pendingTenantId = signal<string | null>(null)` with public `readonly pendingTenantId = this._pendingTenantId.asReadonly()`, plus `getTenantsByEmail(email: string): Observable<TenantSummaryDto[]>` calling `GET /api/v1/tenants/by-email?email=`. Also call `this._pendingTenantId.set(null)` in `logout()`. Done when: signal is readable from interceptor; method returns typed observable; logout clears signal.
- [x] 3.3 `core/interceptors/tenant.interceptor.ts` — change tenant-id resolution to `this.authService.pendingTenantId() ?? this.authService.currentTenantId()`. Done when: interceptor injects `pendingTenantId` into `X-Tenant-Id` header when `currentTenantId` is absent.
- [x] 3.4 `features/auth/login.component.ts` — implement two-step state machine with states `idle | resolvingTenant | tenantPicker | awaitingPassword | submitting`. On email blur: call `getTenantsByEmail()` → 0: show inline error, stay `idle`; 1: set `pendingTenantId`, go `awaitingPassword`; 2+: go `tenantPicker`. On tenant select: set `pendingTenantId`, go `awaitingPassword`. On submit: call `authService.login()` → success: navigate + clear `pendingTenantId`; error: stay `awaitingPassword`. Done when: all four spec scenarios for the frontend two-step flow pass manual verification.
