# Design: Pharmacy Management System

## Technical Approach

Modular monolith with Clean Architecture per bounded context, deployed locally via Docker Compose. Four modules (Identity, Catalog, Inventory, Sales) share a single .NET 10 Web API host and a single SQL Server database with schema-level separation. Each module owns its domain, application, and infrastructure layers. Multi-tenancy is enforced from day 1 via EF Core global query filters with `TenantId` on every entity. CQRS via MediatR separates reads from writes. Manual DTO mapping via extension methods — no AutoMapper, no Mapster.

Frontend: Angular 21 standalone components with signals, PrimeNG, lazy-loaded feature modules, container-presentational pattern. Offline support via `@angular/service-worker` + IndexedDB (Dexie.js). i18n via `@angular/localize`.

## Architecture Decisions

### AD-1: Module Isolation Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Separate projects per layer per module (16+ .csproj) | Strong compile-time boundaries, slow builds | **Rejected** — overkill for v1 |
| Single project with folder/namespace separation | Fast builds, weaker boundaries | **Rejected** — too loose |
| One project per layer, modules as folders within each | Balance of boundaries and pragmatism | **Chosen** |

**Rationale**: 4 projects (Domain, Application, Infrastructure, API) with module folders inside each. Clean Architecture dependency rule enforced by project references. Module isolation enforced by namespace convention. Can split into per-module projects later if needed.

### AD-2: DbContext Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| One DbContext per module | Strong isolation, complex cross-module queries | **Rejected** — no cross-module transactions without distributed coordination |
| Single shared DbContext | Simple, cross-module queries easy, weaker isolation | **Chosen** |

**Rationale**: Single `PharmacyDbContext` with entity configurations organized by module folder. Multi-tenant query filter applied once. Sales needs to read Catalog/Inventory data — a shared context avoids the complexity of cross-context coordination in a monolith. Module boundaries enforced by aggregate design, not DbContext splitting.

### AD-3: Multi-Tenant Resolution

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Subdomain (`tenant1.pharmacy.com`) | Requires DNS/proxy config, complex local dev | **Rejected** |
| Custom header (`X-Tenant-Id`) | Simple, works with any client, explicit | **Chosen** |
| JWT claim (`tenant_id`) | Ties tenancy to auth, can't switch tenants | **Rejected** |

**Rationale**: `X-Tenant-Id` header is set by the frontend HTTP interceptor after login. Backend middleware resolves it into `ICurrentTenantService`. EF Core global query filter references `_tenantService.TenantId` — parameterized per query, not baked at model build time. Admin endpoints can bypass via `IgnoreQueryFilters()`.

### AD-4: Result Pattern Implementation

| Option | Tradeoff | Decision |
|--------|----------|----------|
| FluentResults NuGet | Feature-rich, external dependency | **Rejected** — unnecessary dependency for what we need |
| Custom `Result<T>` | Full control, minimal code, no dependency | **Chosen** |

**Rationale**: Simple `Result<T>` with `Success`, `Failure`, error types (Validation, NotFound, Conflict, Unauthorized). Flows from domain → application → API layer where middleware maps to `ProblemDetails`. ~50 lines of code, no external dependency.

### AD-5: Frontend State Management

| Option | Tradeoff | Decision |
|--------|----------|----------|
| NgRx | Full Redux pattern, high boilerplate | **Rejected** — overkill for this scope |
| Signals + injectable services | Lightweight, Angular-native, sufficient for CRUD | **Chosen** |

**Rationale**: Each feature has a `*Store` service using Angular signals (`signal()`, `computed()`). No global store needed — each module manages its own state. If complexity grows, NgRx can be added per-module later.

### AD-6: Offline Support Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Full offline-first (all writes to IndexedDB, sync later) | Complex conflict resolution, data integrity risk | **Rejected** — too complex for v1 |
| Read cache + queue critical writes | Catalog/inventory viewable offline, sales queued for sync | **Chosen** |

**Rationale**: Service Worker caches app shell + static assets. Dexie.js (IndexedDB wrapper) caches catalog and inventory reads. Sales created offline are queued in IndexedDB and synced when connection restores (with conflict detection by timestamp). Reports require online — they query live data.

### AD-7: Reporting Architecture

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Dedicated reporting service/OLAP | Strong separation, extra infrastructure | **Rejected** — overkill for v1 |
| Read-optimized queries on same DB | Simple, uses existing data, good enough for v1 | **Chosen** |

**Rationale**: Reports module uses read-only MediatR queries with raw SQL or EF projections for performance. No separate read database in v1. Report types: daily sales summary, inventory valuation, low-stock alerts, sales by category/period. Can evolve to materialized views or a read replica later.

### AD-8: i18n Approach

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `ngx-translate` (runtime, JSON files) | Single build, runtime switching, community-maintained | **Rejected** — less maintained, no compiler optimizations |
| `@angular/localize` (compile-time) | Angular-native, ICU support, one build per locale | **Chosen** |

**Rationale**: `@angular/localize` is the official Angular recommendation. Full ICU support for plurals/dates. Works natively with standalone components. Backend returns error codes, frontend maps them to localized messages.

## Data Flow

### Sale Processing (Critical Path)

```
Frontend (POS)                    API                        Application                 Domain
     │                             │                              │                        │
     ├─── POST /api/v1/sales ────→ │                              │                        │
     │    {items, tenantId}        ├── CreateSaleCommand ────────→ │                        │
     │                             │                              ├── Validate items ─────→ │
     │                             │                              │   Check stock levels    │
     │                             │                              │   ←── Result<Sale> ─────┤
     │                             │                              │                        │
     │                             │   MediatR Pipeline:          │                        │
     │                             │   Logging → Validation →     │                        │
     │                             │   Transaction → Handler      │                        │
     │                             │                              │                        │
     │                             │  ┌─ TransactionBehavior ───┐ │                        │
     │                             │  │ BEGIN TRANSACTION       │ │                        │
     │                             │  │  Create Sale aggregate  │ │                        │
     │                             │  │  Deduct stock per item  │ │                        │
     │                             │  │ COMMIT                  │ │                        │
     │                             │  └─────────────────────────┘ │                        │
     │                             │                              │                        │
     │  ←── 201 + SaleDto ────────┤  ←── Result<SaleDto> ────────┤                        │
```

### Multi-Tenant Request Flow

```
Browser ──→ Angular Interceptor ──→ API Middleware ──→ ICurrentTenantService ──→ EF Query Filter
              (adds X-Tenant-Id       (resolves &         (scoped service,          (WHERE TenantId = @p)
               header from            validates           holds TenantId
               user's tenant)         tenant)             for request)
```

### Offline Sync Flow

```
Online:   Angular ──→ API ──→ DB    (normal flow)
                 └──→ Dexie.js      (cache reads)

Offline:  Angular ──→ Dexie.js      (read from cache)
                 └──→ SyncQueue     (write to queue)

Reconnect: SyncService ──→ Drain queue ──→ API ──→ DB
                      └── Conflict? ──→ User resolution UI
```

## File Changes

### Backend Structure

| File / Path | Action | Description |
|-------------|--------|-------------|
| `src/backend/PharmacySystem.sln` | Create | Solution file |
| `src/backend/Directory.Build.props` | Create | Shared build properties (nullable, implicit usings) |
| `src/backend/docker-compose.yml` | Create | SQL Server + API containers |
| `src/backend/docker-compose.override.yml` | Create | Local dev overrides (ports, volumes) |
| `src/backend/src/PharmacySystem.Domain/` | Create | Domain layer — entities, value objects, interfaces |
| `src/backend/src/PharmacySystem.Application/` | Create | Application layer — commands, queries, behaviors |
| `src/backend/src/PharmacySystem.Infrastructure/` | Create | Infrastructure — EF Core, repositories, services |
| `src/backend/src/PharmacySystem.Api/` | Create | API — controllers, middleware, DI registration |
| `src/backend/tests/PharmacySystem.UnitTests/` | Create | Unit tests |
| `src/backend/tests/PharmacySystem.IntegrationTests/` | Create | Integration tests with test containers |
| `src/backend/tests/PharmacySystem.ArchTests/` | Create | Architecture tests (dependency rules) |

### Backend — Domain Layer (`PharmacySystem.Domain/`)

| Path | Description |
|------|-------------|
| `Common/Entity.cs` | Base entity with `Id`, `TenantId`, audit fields |
| `Common/AggregateRoot.cs` | Base aggregate with domain events |
| `Common/ValueObject.cs` | Value object base class |
| `Common/Result.cs` | `Result<T>` implementation |
| `Common/Errors/` | `DomainError`, `ValidationError`, `NotFoundError`, `ConflictError` |
| `Common/Interfaces/ICurrentTenantService.cs` | Tenant resolution contract |
| `Identity/User.cs`, `Role.cs` | Identity aggregates |
| `Catalog/Product.cs`, `Category.cs`, `Supplier.cs` | Catalog aggregates and entities |
| `Inventory/InventoryItem.cs`, `StockMovement.cs` | Inventory aggregate |
| `Sales/Sale.cs`, `SaleItem.cs` | Sale aggregate with line items |

### Backend — Application Layer (`PharmacySystem.Application/`)

| Path | Description |
|------|-------------|
| `Common/Interfaces/IPharmacyDbContext.cs` | DbContext abstraction |
| `Common/Behaviors/ValidationBehavior.cs` | FluentValidation pipeline |
| `Common/Behaviors/LoggingBehavior.cs` | Request/response logging |
| `Common/Behaviors/TransactionBehavior.cs` | Unit of work per command |
| `Common/Mappings/` | Extension method mapping classes per module |
| `Identity/Commands/`, `Identity/Queries/` | Auth use cases |
| `Catalog/Commands/`, `Catalog/Queries/` | CRUD use cases |
| `Inventory/Commands/`, `Inventory/Queries/` | Stock use cases |
| `Sales/Commands/`, `Sales/Queries/` | Sale use cases |
| `Reports/Queries/` | Reporting queries (read-only) |

### Backend — Infrastructure Layer (`PharmacySystem.Infrastructure/`)

| Path | Description |
|------|-------------|
| `Persistence/PharmacyDbContext.cs` | Shared DbContext with tenant filter |
| `Persistence/Configurations/{Module}/` | EF entity configurations per module |
| `Persistence/Interceptors/AuditInterceptor.cs` | CreatedAt, UpdatedAt, CreatedBy |
| `Persistence/Interceptors/SoftDeleteInterceptor.cs` | IsDeleted filter |
| `Persistence/Interceptors/TenantInterceptor.cs` | Auto-set TenantId on SaveChanges |
| `Persistence/Migrations/` | EF Core migrations |
| `Identity/JwtTokenService.cs` | JWT generation, refresh tokens |
| `DependencyInjection.cs` | Infrastructure DI registration |

### Backend — API Layer (`PharmacySystem.Api/`)

| Path | Description |
|------|-------------|
| `Program.cs` | Host builder, middleware pipeline |
| `Controllers/V1/{Module}Controller.cs` | Versioned controllers per module |
| `Middleware/ExceptionHandlingMiddleware.cs` | Global error → ProblemDetails |
| `Middleware/TenantMiddleware.cs` | Resolve X-Tenant-Id header |
| `Extensions/ResultExtensions.cs` | `Result<T>` → IActionResult mapping |
| `appsettings.json` | Config (JWT, connection strings) |
| `Dockerfile` | Multi-stage build |

### Frontend Structure

| File / Path | Action | Description |
|-------------|--------|-------------|
| `src/frontend/` | Create | Angular 21 app (via `ng new`) |
| `src/frontend/src/app/core/interceptors/auth.interceptor.ts` | Create | JWT token injection |
| `src/frontend/src/app/core/interceptors/tenant.interceptor.ts` | Create | X-Tenant-Id header |
| `src/frontend/src/app/core/interceptors/error.interceptor.ts` | Create | Global error handling |
| `src/frontend/src/app/core/guards/auth.guard.ts` | Create | Route protection |
| `src/frontend/src/app/core/guards/role.guard.ts` | Create | Role-based route protection |
| `src/frontend/src/app/core/services/auth.service.ts` | Create | Login, register, token management |
| `src/frontend/src/app/core/services/sync.service.ts` | Create | Offline sync queue management |
| `src/frontend/src/app/core/services/offline-db.service.ts` | Create | Dexie.js IndexedDB wrapper |
| `src/frontend/src/app/shared/components/` | Create | Reusable presentational components |
| `src/frontend/src/app/shared/models/` | Create | TypeScript interfaces/types |
| `src/frontend/src/app/features/auth/` | Create | Login, register pages |
| `src/frontend/src/app/features/catalog/` | Create | Product/category/supplier CRUD |
| `src/frontend/src/app/features/inventory/` | Create | Stock management UI |
| `src/frontend/src/app/features/sales/` | Create | POS-style sale creation |
| `src/frontend/src/app/features/reports/` | Create | Dashboard and report views |
| `src/frontend/src/app/app.routes.ts` | Create | Lazy-loaded routes |
| `src/frontend/src/app/app.config.ts` | Create | Providers (SW, i18n, HTTP, PrimeNG) |

## Interfaces / Contracts

### Result Pattern (Domain)

```csharp
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public DomainError? Error { get; }

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(DomainError error) => new(false, default, error);
}

public abstract record DomainError(string Code, string Message);
public record ValidationError(string Code, string Message, IDictionary<string, string[]> Errors)
    : DomainError(Code, Message);
public record NotFoundError(string Code, string Message) : DomainError(Code, Message);
public record ConflictError(string Code, string Message) : DomainError(Code, Message);
```

### Manual DTO Mapping (Extension Methods)

```csharp
// Application/Catalog/Mappings/ProductMappings.cs
public static class ProductMappings
{
    public static ProductDto ToDto(this Product entity) => new(
        Id: entity.Id,
        Name: entity.Name,
        Sku: entity.Sku,
        Price: entity.Price,
        CategoryName: entity.Category?.Name ?? string.Empty,
        StockLevel: entity.StockLevel);

    public static Product ToDomain(this CreateProductCommand cmd) => new(
        name: cmd.Name,
        sku: cmd.Sku,
        price: cmd.Price,
        categoryId: cmd.CategoryId);
}
```

### Multi-Tenant Base Entity

```csharp
public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public bool IsDeleted { get; set; }
}
```

### Tenant Query Filter (DbContext)

```csharp
public class PharmacyDbContext : DbContext
{
    private readonly ICurrentTenantService _tenantService;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Apply to all entities implementing ITenantEntity
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(Entity).IsAssignableFrom(entityType.ClrType))
            {
                builder.Entity(entityType.ClrType)
                    .HasQueryFilter(BuildTenantFilter(entityType.ClrType));
            }
        }
    }

    // Dynamic expression: e => e.TenantId == _tenantService.TenantId && !e.IsDeleted
    private LambdaExpression BuildTenantFilter(Type entityType) { /* ... */ }
}
```

### Frontend Auth Interceptor

```typescript
// core/interceptors/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

### Frontend Tenant Interceptor

```typescript
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tenantId = authService.currentTenantId();
  if (tenantId) {
    req = req.clone({ setHeaders: { 'X-Tenant-Id': tenantId } });
  }
  return next(req);
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Domain entities, value objects, Result pattern | xUnit + FluentAssertions. Test business rules, validation, stock deduction logic. |
| Unit | MediatR handlers | xUnit + NSubstitute. Mock DbContext, test command/query handlers in isolation. |
| Unit | DTO mapping extensions | xUnit. Verify ToDto/ToDomain correctness. |
| Integration | API endpoints, EF queries, tenant isolation | WebApplicationFactory + Testcontainers (SQL Server). Verify tenant filter, auth middleware. |
| Architecture | Dependency rules (Domain has no infra refs) | NetArchTest. Assert Clean Architecture layers. |
| Frontend Unit | Components, services, stores | Jest + Angular Testing Library. Test signal-based stores, interceptors. |
| Frontend E2E | Critical flows (login, create sale) | Playwright. Verify full user journeys. |

## Migration / Rollout

### Database Migration Strategy

- EF Core Code-First migrations
- Each delivery slice includes its own migration
- `dotnet ef migrations add {SliceName}` per slice
- Docker entrypoint runs `dotnet ef database update` on startup
- Rollback: `dotnet ef database update {PreviousMigration}`

### Local Development (Phase 1)

```yaml
# docker-compose.yml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      SA_PASSWORD: "Dev@12345"
      ACCEPT_EULA: "Y"
    ports: ["1433:1433"]
    volumes: ["sqldata:/var/opt/mssql"]

  api:
    build: ./src/backend/src/PharmacySystem.Api
    environment:
      ConnectionStrings__Default: "Server=sqlserver;Database=PharmacyDb;User=sa;Password=Dev@12345;TrustServerCertificate=true"
    ports: ["5000:8080"]
    depends_on: [sqlserver]

  frontend:
    build: ./src/frontend
    ports: ["4200:80"]
    depends_on: [api]

volumes:
  sqldata:
```

### Phase 2 (Azure — deferred)

Azure App Service + Azure SQL. Not designed in this phase.

## Cross-Cutting Concerns

### Logging

Serilog with structured logging. Console sink for local dev, Seq or Application Insights for production. Log enrichment with TenantId, UserId, CorrelationId.

### Health Checks

`/health` endpoint: SQL Server connectivity, disk space. Used by Docker healthcheck and future load balancer.

### CORS

Configured in `Program.cs`. Local dev allows `http://localhost:4200`. Production restricts to deployment domain.

### Rate Limiting

ASP.NET Core built-in rate limiter. Fixed window per IP. Applied to auth endpoints (login/register) to prevent brute force.

### Reporting

Reports module — read-only MediatR queries:
- Daily/weekly/monthly sales summaries (grouped by date, category)
- Inventory valuation (quantity * cost per product)
- Low-stock alerts (below configurable threshold)
- Top-selling products by period

Queries use EF projections or raw SQL for performance. No separate OLAP database in v1.

## Open Questions

- [ ] PrimeNG theme: which preset theme to use? (Lara, Aura, Material) — affects frontend scaffolding
- [ ] Refresh token strategy: rotate on use, or fixed expiry? — can decide during Identity slice implementation
- [ ] Offline conflict resolution UX: auto-merge or manual review? — can decide during Sales frontend slice
