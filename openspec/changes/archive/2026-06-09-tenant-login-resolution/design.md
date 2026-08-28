# Design: Tenant Login Resolution

_Date: 2026-06-08_

---

## Technical Approach

Break the login deadlock by resolving `tenantId` **before** authentication — not during. A new anonymous endpoint `GET /api/v1/tenants/by-email` looks up which tenants the email belongs to across all tenants (bypassing EF global filters). The frontend performs this lookup on email blur; the backend command handlers do the same as a fallback when `tenantId == Guid.Empty`. Both layers converge on the same `pendingTenantId` signal pattern to carry the resolved tenant into the request.

---

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **New `/tenants/by-email` endpoint** vs. frontend slug entry | Transparent UX, no user burden; slightly wider attack surface | **New endpoint** — rate-limited, returns name/slug only |
| **`IgnoreQueryFilters()` in `UserManagerService`** vs. new DbContext method | `UserManagerService` already owns all user queries; keeps Application layer clean | **`UserManagerService.FindTenantsByEmailAsync`** with `IgnoreQueryFilters()` — see critical note below |
| **New `GetTenantsByEmailQuery` (CQRS)** vs. direct `UserManagerService` call in controller | Consistent CQRS pattern; validates via MediatR pipeline behaviors | **New query + handler** — follows existing `GetCurrentUserQuery` pattern |
| **`TenantSelectionRequiredError` (HTTP 422)** vs. custom 200 envelope with `needsPicker` flag | Uniform error model using `Result<T>` + `ResultExtensions`; 422 is semantically correct for "unprocessable without more context" | **New `DomainError` subtype → 422** — must also extend `ResultExtensions.ToActionResult` |
| **Two-step login form** vs. single form + hidden picker | Cleaner UX; separates concerns (tenant discovery vs. auth); aligns with Google/Microsoft login patterns | **Two-step state machine** — `idle → resolvingTenant → tenantPicker → awaitingPassword → submitting` |
| **`pendingTenantId` writable signal in `AuthService`** vs. component-local variable | Interceptor already injects `AuthService`; single source of truth for tenant header across all requests | **Signal in `AuthService`** — `tenantInterceptor` reads `pendingTenantId() ?? currentTenantId()` |

### Critical: `IgnoreQueryFilters()` Rationale

`PharmacyDbContext` applies a global EF query filter to every `Entity`-derived type:
`e.TenantId == _tenantService.TenantId && !e.IsDeleted`.

At login time `_tenantService.TenantId == Guid.Empty` — no request header was sent. Any query on `ApplicationUser` without `IgnoreQueryFilters()` will return zero rows because `Guid.Empty != actual_tenant_id`. `FindTenantsByEmailAsync` **must** call `.IgnoreQueryFilters()` on the `userManager.Users` queryable before filtering by email; otherwise cross-tenant user lookup always returns nothing and the deadlock is not broken.

---

## Data Flow

```
Step 1 — Tenant Discovery (on email blur)

Browser → GET /api/v1/tenants/by-email?email=x
         TenantMiddleware: X-Tenant-Id absent → tenantService.TenantId = Guid.Empty (unchanged)
         GetTenantsByEmailQueryHandler
           └─ UserManagerService.FindTenantsByEmailAsync
                └─ userManager.Users.IgnoreQueryFilters()
                     .Where(u => u.Email == email && u.TenantId != Guid.Empty)
                     .Select(u => u.TenantId)
                     .Distinct()
                     → JOIN Tenants WHERE IsActive == true
                     → List<TenantSummaryDto>
         → 200 OK  [ {id, name, slug}, ... ]  (empty array = unknown email)

Step 2 — Login (after tenant resolved)

Browser → POST /api/v1/auth/login  (+ X-Tenant-Id: <pendingTenantId>)
         TenantMiddleware: reads header → tenantService.TenantId = resolved GUID
         LoginCommandHandler
           if (tenantId == Guid.Empty)  ← fallback path (direct API call, no frontend)
             FindTenantsByEmailAsync → 0:401 | 1:auto-set | 2+:422+list
           else                         ← normal path (frontend already set header)
             FindByEmailAndTenantAsync → check password → generate tokens → 200
```

```
Frontend State Machine

[idle]
  email blur → getTenantsByEmail()
    ↓
[resolvingTenant]
  0 results → errorMessage "No account found" → [idle]
  1 result  → pendingTenantId.set(id)          → [awaitingPassword]
  2+ results→                                   → [tenantPicker]
    user selects → pendingTenantId.set(id)      → [awaitingPassword]
    ↓
[awaitingPassword]
  submit() → authService.login()
    ↓
[submitting]
  success → router.navigate(['/catalog']); pendingTenantId.set(null)
  error   → errorMessage; [awaitingPassword]
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/backend/src/PharmacySystem.Domain/Common/Result.cs` | Modify | Add `TenantSelectionRequiredError` record |
| `src/backend/src/PharmacySystem.Application/Identity/DTOs/AuthDTOs.cs` | Modify | Add `TenantSummaryDto` record |
| `src/backend/src/PharmacySystem.Application/Identity/Commands/IUserManagerService.cs` | Modify | Add `FindTenantsByEmailAsync(email)` to interface |
| `src/backend/src/PharmacySystem.Infrastructure/Identity/UserManagerService.cs` | Modify | Implement `FindTenantsByEmailAsync` with `IgnoreQueryFilters()` |
| `src/backend/src/PharmacySystem.Application/Identity/Queries/GetTenantsByEmailQuery.cs` | Create | New CQRS query + handler |
| `src/backend/src/PharmacySystem.Application/Identity/Commands/LoginCommand.cs` | Modify | Add fallback branch when `tenantId == Guid.Empty` |
| `src/backend/src/PharmacySystem.Application/Identity/Commands/RegisterCommand.cs` | Modify | Same fallback branch as `LoginCommand` |
| `src/backend/src/PharmacySystem.Api/Controllers/V1/AuthController.cs` | Modify | Add `GetTenantsByEmail` endpoint |
| `src/backend/src/PharmacySystem.Api/Extensions/ResultExtensions.cs` | Modify | Add `TenantSelectionRequiredError` → HTTP 422 case |
| `src/frontend/.../core/models/auth.model.ts` | Modify | Add `TenantSummaryDto` interface |
| `src/frontend/.../core/services/auth.service.ts` | Modify | Add `pendingTenantId` writable signal + `getTenantsByEmail()` method |
| `src/frontend/.../core/interceptors/tenant.interceptor.ts` | Modify | Read `pendingTenantId() ?? currentTenantId()` |
| `src/frontend/.../features/auth/login.component.ts` | Modify | Two-step state machine login flow |

---

## Interfaces / Contracts

```csharp
// Domain/Common/Result.cs — new error type
public record TenantSelectionRequiredError(
    string Code,
    string Message,
    IReadOnlyList<TenantSummaryDto> Tenants) : DomainError(Code, Message);

// Application/Identity/DTOs/AuthDTOs.cs — new DTO
public record TenantSummaryDto(Guid Id, string Name, string Slug);

// Application/Identity/Commands/IUserManagerService.cs — new method
Task<IReadOnlyList<TenantSummaryDto>> FindTenantsByEmailAsync(string email);
```

```typescript
// core/models/auth.model.ts — new interface
export interface TenantSummaryDto {
  id: string;
  name: string;
  slug: string;
}
```

**HTTP Contracts:**

| Endpoint | Method | Auth | Status | Body |
|----------|--------|------|--------|------|
| `/api/v1/tenants/by-email?email=` | GET | Anonymous | 200 | `TenantSummaryDto[]` (empty = unknown email) |
| `/api/v1/auth/login` | POST | Anonymous | 200 | `AuthResponse` |
| `/api/v1/auth/login` | POST | Anonymous | 401 | `ProblemDetails` (0 tenants or bad creds) |
| `/api/v1/auth/login` | POST | Anonymous | 422 | `ProblemDetails` + `extensions.tenants: TenantSummaryDto[]` |

**HTTP 422 body shape** (via `ResultExtensions`):
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Tenant Selection Required",
  "status": 422,
  "detail": "Multiple tenants found for this email. Please select one.",
  "tenants": [{ "id": "...", "name": "Farmacia Norte", "slug": "north" }]
}
```

---

## `ResultExtensions` Extension Point

`TenantSelectionRequiredError` must be handled in `ResultExtensions.ToActionResult`:

```csharp
TenantSelectionRequiredError tenantSelection =>
    new ObjectResult(new ProblemDetails
    {
        Type = "https://tools.ietf.org/html/rfc7807",
        Title = "Tenant Selection Required",
        Status = StatusCodes.Status422UnprocessableEntity,
        Detail = tenantSelection.Message,
        Extensions = { ["tenants"] = tenantSelection.Tenants }
    })
    { StatusCode = StatusCodes.Status422UnprocessableEntity },
```

Place this case **before** the `_` fallthrough in the switch expression.

---

## `GetTenantsByEmailQuery` — Handler Shape

```csharp
// New file: Application/Identity/Queries/GetTenantsByEmailQuery.cs
public record GetTenantsByEmailQuery(string Email) : IRequest<Result<IReadOnlyList<TenantSummaryDto>>>;

// Handler: delegates to IUserManagerService — no direct DB access from Application layer
public class GetTenantsByEmailQueryHandler(IUserManagerService userManager)
    : IRequestHandler<GetTenantsByEmailQuery, Result<IReadOnlyList<TenantSummaryDto>>>
{
    public async Task<Result<IReadOnlyList<TenantSummaryDto>>> Handle(
        GetTenantsByEmailQuery request, CancellationToken cancellationToken)
    {
        var tenants = await userManager.FindTenantsByEmailAsync(request.Email);
        return Result<IReadOnlyList<TenantSummaryDto>>.Success(tenants);
    }
}
```

---

## Security Considerations

| Threat | Mitigation |
|--------|------------|
| Email enumeration via `/tenants/by-email` | Returns same response shape (empty array) for unknown emails; rate-limited `"auth"` policy (100/min/IP); returns only `name/slug`, never email or internal IDs beyond tenant GUID |
| Timing side-channel | Handler always awaits full DB call; no early exit on miss |
| Tenant GUID leakage | GUID is required by the interceptor; mitigated by rate limit + HTTPS only |
| `X-Tenant-Id` spoofing | Unchanged from current behavior — the backend always re-validates user belongs to claimed tenant in `FindByEmailAndTenantAsync` |
| `pendingTenantId` stale after logout | `authService.logout()` must also call `this._pendingTenantId.set(null)` |

---

## Testing Strategy

All automated testing deferred to v2 per `openspec/config.yaml`. Manual verification checklist (for `sdd-verify`):

| Scenario | Expected |
|----------|----------|
| Single-tenant email, correct password | Auto-resolves, login succeeds (200) |
| Single-tenant email, wrong password | 401 with generic message |
| Multi-tenant email | Tenant picker shown; after selection login proceeds |
| Unknown email | Error message "No account found" (no 401 disclosed) |
| `/tenants/by-email` with unknown email | `[]` with 200 |
| Registration without `X-Tenant-Id` header | Fallback resolves or returns 422 |
| Rate limit exceeded | 429 response |

---

## Migration / Rollout

No database migrations required. No data model changes. All changes are additive or guarded by `tenantId == Guid.Empty`. Single PR delivery is viable (~187 lines, within 400-line budget).

---

## Open Questions

- [ ] Should `pendingTenantId` be cleared after a failed login attempt, or only after success/logout? (Recommendation: clear only on success/logout to allow retry without re-picking tenant.)
- [ ] Does the `TenantSelectionRequiredError` tenant list need to be paginated? (Current assumption: a user belonging to >20 tenants is an edge case — no pagination needed for v1.)
