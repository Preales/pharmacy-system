## Exploration: Pharmacy Management System

### Current State

The workspace `E:/Proyecto/Gentleman-ai` is a **meta-configuration project** for Gentle AI tooling (opencode/kiro IDE agents, skills, MCP servers). It contains **no application source code** — no `src/` folder, no .NET projects, no Angular projects, no `package.json`, no `.sln` or `.csproj` files.

The OpenSpec infrastructure is initialized (`openspec/config.yaml`, `openspec/specs/`, `openspec/changes/`), but no specs or active changes exist yet. The git repository has no commits.

**Environment detected:**
- **.NET SDK**: 10.0.103 (also 9.0.314 and 7.0.410 available)
- **Angular CLI**: 21.2.14
- **Node.js**: 22.22.2
- **npm**: 10.9.7
- **OS**: Windows 11 x64

This is a **greenfield project** — everything must be created from scratch inside `/src`.

### Affected Areas

Since this is a greenfield project, no existing code is affected. The following areas will be **created**:

- `src/backend/` — .NET 10 Web API solution with DDD/CQRS architecture
- `src/frontend/` — Angular 21 application with best practices
- `openspec/config.yaml` — Must be updated to reflect the new tech stack
- `openspec/specs/` — Domain specs will be created per bounded context

### Bounded Contexts Identified

Based on the user's requirements, the following DDD bounded contexts are needed:

| Bounded Context | Responsibility | Key Aggregates |
|----------------|---------------|----------------|
| **Sales** | Process sales transactions, receipts | Sale, SaleItem, Receipt |
| **Inventory** | Track stock levels, movements | InventoryItem, StockMovement |
| **Catalog** | Product registration and management | Product, Category, Supplier |
| **Identity** | Authentication, authorization, user management | User, Role, Permission |

### Approaches

#### 1. **Monolith with Clean Architecture (Recommended)**
Modular monolith following Clean Architecture with screaming architecture folder structure. Each bounded context is a module within a single solution.

- **Structure**:
  ```
  src/backend/
  ├── PharmacySystem.sln
  ├── src/
  │   ├── PharmacySystem.Api/              (Presentation — Controllers, Middleware)
  │   ├── PharmacySystem.Application/      (Use Cases — Commands, Queries, Handlers)
  │   ├── PharmacySystem.Domain/           (Entities, Value Objects, Domain Events)
  │   └── PharmacySystem.Infrastructure/   (EF Core, Repositories, External Services)
  ├── tests/
  │   ├── PharmacySystem.UnitTests/
  │   ├── PharmacySystem.IntegrationTests/
  │   └── PharmacySystem.ArchTests/
  └── Directory.Build.props
  ```
- Pros: Simpler deployment, shared database, easier initial development, standard .NET pattern
- Cons: Bounded contexts share process, scaling is all-or-nothing
- Effort: **Medium**

#### 2. **Microservices per Bounded Context**
Each bounded context is a separate .NET project with its own database and API.

- Pros: Independent scaling, strong BC isolation, technology heterogeneity
- Cons: Massive initial complexity, requires service mesh/API gateway, overkill for a pharmacy system
- Effort: **Very High**

#### 3. **Vertical Slice Architecture**
Organize by feature/slice rather than by layer. Each use case (command/query) is a self-contained slice.

- Pros: High cohesion per feature, easier to understand individual flows
- Cons: Can lead to duplication, less conventional in .NET enterprise, harder to enforce cross-cutting concerns
- Effort: **Medium**

### Backend Architecture Details (Approach 1 — Recommended)

#### Key Patterns

| Pattern | Implementation |
|---------|---------------|
| **CQRS** | MediatR for command/query separation. Commands mutate state, Queries read. Separate read/write models where complexity justifies it. |
| **Result Pattern** | `Result<T>` type (e.g., FluentResults or custom) — no exceptions for business logic flow control. Controllers map Result to HTTP responses. |
| **EF Interceptors** | `SaveChangesInterceptor` for audit fields (CreatedAt, UpdatedAt, CreatedBy). `SoftDeleteInterceptor` for logical deletes. |
| **Error Handling** | Global exception handler middleware for unexpected errors. `ProblemDetails` (RFC 7807) for API error responses. |
| **DDD** | Rich domain entities with behavior. Value Objects for typed IDs, Money, etc. Domain Events via MediatR notifications. |
| **Authentication** | ASP.NET Identity + JWT Bearer tokens. Role-based authorization with policies. |

#### Key NuGet Packages

- `MediatR` — CQRS command/query dispatching
- `FluentValidation` — Input validation in pipeline behaviors
- `Microsoft.AspNetCore.Identity.EntityFrameworkCore` — User management
- `Microsoft.AspNetCore.Authentication.JwtBearer` — JWT auth
- `Microsoft.EntityFrameworkCore.SqlServer` (or `.Sqlite` for dev) — Data access
- `Mapster` or `AutoMapper` — Object mapping
- `FluentResults` — Result pattern (or custom implementation)
- `Serilog` — Structured logging
- `Swashbuckle.AspNetCore` — OpenAPI/Swagger

### Frontend Architecture Details

#### Angular 21 Best Practices

| Practice | Detail |
|----------|--------|
| **Standalone Components** | No NgModules. All components are standalone. |
| **Signals** | Use Angular Signals for reactive state management. |
| **Lazy Loading** | Route-level lazy loading with `loadComponent` / `loadChildren`. |
| **Typed Reactive Forms** | Strictly typed forms for all inputs. |
| **Interceptors** | Functional HTTP interceptors for auth token injection and error handling. |
| **Guards** | Functional route guards for auth protection. |
| **Architecture** | Container-Presentational pattern. Smart containers handle state, dumb presenters handle UI. |

#### Frontend Structure
```
src/frontend/
├── angular.json
├── package.json
├── src/
│   ├── app/
│   │   ├── core/          (guards, interceptors, services, auth)
│   │   ├── shared/        (components, pipes, directives, models)
│   │   ├── features/
│   │   │   ├── sales/     (sales feature module — lazy loaded)
│   │   │   ├── inventory/ (inventory feature — lazy loaded)
│   │   │   ├── products/  (product catalog — lazy loaded)
│   │   │   └── auth/      (login, register — lazy loaded)
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   └── styles/
└── tsconfig.json
```

### Recommendation

**Approach 1: Modular Monolith with Clean Architecture** is the clear recommendation for a pharmacy management system:

1. A pharmacy system is a single-domain application — microservices add unjustified complexity
2. Clean Architecture with CQRS provides all the separation needed
3. The modular structure (bounded contexts as namespaces/folders) allows future extraction to microservices if ever needed
4. It aligns with all requested patterns (DDD, CQRS, EF interceptors, Result pattern, error handlers)
5. Both .NET 10 and Angular 21 are the latest stable versions and are available in the environment

### Risks

1. **Scope is broad**: Sales + Inventory + Products + Auth is a significant system. Must be broken into incremental deliverables to avoid a single massive PR.
2. **Database choice not specified**: SQL Server is the standard for .NET enterprise, but PostgreSQL or SQLite could also work. Needs user decision.
3. **No existing CI/CD or testing infrastructure**: The OpenSpec config shows `testing: none`. Must set up test infrastructure from scratch.
4. **OpenSpec config needs update**: Current config describes a "meta-config project" — it must be updated to reflect the real tech stack when the project starts.
5. **Angular 21 is very recent**: Some community packages may not yet support it. Core Angular features are stable.
6. **Authentication complexity**: JWT + refresh tokens + role-based access adds significant infrastructure. Could start with basic JWT and iterate.

### Open Questions

1. **Database**: SQL Server, PostgreSQL, or SQLite for development? (Recommendation: SQL Server for production, SQLite for local dev)
2. **Deployment target**: Docker containers? Azure? Local IIS? (Affects project structure and configuration)
3. **UI framework**: Angular Material, PrimeNG, TailwindCSS, or other? (Affects frontend setup significantly)
4. **Initial scope priority**: Which bounded context should be built first? (Recommendation: Identity/Auth first, then Catalog, then Inventory, then Sales — each builds on the previous)
5. **API versioning**: Required from the start? (Recommendation: yes, use URL path versioning `/api/v1/`)
6. **Internationalization**: Spanish only, or multi-language support? (Affects both frontend and backend error messages)

### Ready for Proposal

**Yes** — The workspace is clean (greenfield), all required tooling is installed (.NET 10, Angular 21, Node 22), and the architecture approach is clear. The proposal phase should define the concrete scope, phased delivery plan, and resolve the open questions above.
