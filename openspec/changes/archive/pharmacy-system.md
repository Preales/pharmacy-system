# Archive: pharmacy-system

> **Specs promoted**: 2026-06-09 — delta specs copied to `openspec/specs/{domain}/spec.md`

**Change name**: `pharmacy-system`
**Archived**: 2026-06-06
**Branch**: `slice/8-polish` (final branch in chain)
**Chain strategy**: feature-branch-chain (9 slices, `slice/0-scaffolding` → `slice/8-polish`)
**Verification result**: PASS (100% — 45/45 spec scenarios after post-verify fixes)
**Tasks completed**: 104/104

---

## Executive Summary

A greenfield multi-tenant pharmacy management system built from scratch in 9 incremental delivery slices. The system provides a secure, role-based web application for pharmacy operations: JWT authentication with 3-role RBAC, full product catalog management, inventory tracking with immutable audit trail, POS-style sales processing with atomic stock deduction, offline queuing with auto-sync on reconnect, and operational reports. Built on .NET 10 (Clean Architecture, DDD, CQRS via MediatR, EF Core, SQL Server) and Angular 19 (signals, PrimeNG Material, Dexie.js). Multi-tenancy is enforced at the EF Core query-filter layer via `X-Tenant-Id` header. Deployed locally via Docker Compose (3 services: SQL Server + API + nginx-served frontend). Two spec deviations found in verification were fixed before archiving: a missing `/api/v1/sales/{id}/receipt` endpoint and incomplete backend i18n resource files.

---

## What Was Built

### Bounded Contexts

| Context | Domain Objects | Key Behaviors |
|---------|---------------|---------------|
| **Identity / Auth** | User, Role, Tenant, RefreshToken | JWT + refresh token rotation, tenant-scoped email uniqueness, 3 RBAC policies (Admin / Pharmacist / Cashier) |
| **Product Catalog** | Product, Category, Supplier | Full CRUD, soft delete, SKU uniqueness per tenant, category hierarchy, paginated search with filters |
| **Inventory Management** | InventoryItem, StockMovement | Immutable stock movement log (Ingress / Sale / Adjustment), `CurrentStock` as single source of truth, low-stock threshold query |
| **Sales Processing** | Sale, SaleLine, ConflictAlert | Atomic sale creation with per-item stock deduction (TransactionBehavior), void with stock restoration, receipt endpoint, offline queuing |
| **Reports** | — (read queries) | Daily/weekly/monthly sales summary, inventory valuation, low-stock report |
| **Cross-Cutting** | — | Multi-tenancy, soft delete, audit fields, i18n (backend `.resx` + `IStringLocalizer`, frontend Angular localize), rate limiting on auth endpoints |

### Key Architectural Decisions

| Decision | What Was Chosen | Why |
|----------|----------------|-----|
| **Module isolation** | 4 projects per layer (Domain / Application / Infrastructure / API), modules as folders | Balanced compile-time boundaries + pragmatic build speed |
| **DbContext** | Single shared `PharmacyDbContext` | Sales needs cross-module reads; single context avoids distributed transaction complexity |
| **Multi-tenancy** | `X-Tenant-Id` header + EF global query filter | Simple, works with any client; parameterized per-query filter (not baked at model build time) |
| **Result pattern** | Custom `Result<T>` (no FluentResults) | Full control, ~50 lines, zero external dependency |
| **DTO mapping** | Manual extension methods (`ToDto()`, `ToDomain()`) | NO AutoMapper / Mapster — explicit, type-safe, searchable |
| **Frontend state** | Angular signals + injectable store services | No NgRx overhead; per-module signal stores sufficient for CRUD scope |
| **Offline strategy** | Queue sales only to Dexie.js; sync on reconnect | "Notify and resolve" conflict strategy avoids full offline-first complexity |
| **Reporting** | Read-only EF queries with `AsNoTracking()` | No OLAP service needed at v1 scale |
| **i18n backend** | `.resx` files + `IStringLocalizer<ValidationMessages>` | Standard .NET localization; `AcceptLanguageHeaderRequestCultureProvider` picks culture from request header |
| **i18n frontend** | `@angular/localize` + JSON translation files | Note: compile-time XLIFF pipeline was not finalized — see Known Gaps below |

### MediatR Pipeline (order)

```
LoggingBehavior → ValidationBehavior → TransactionBehavior → Handler
```

### EF Core Interceptors

- `AuditInterceptor` — sets `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`
- `SoftDeleteInterceptor` — intercepts `EntityState.Deleted` → sets `IsDeleted = true`
- `TenantInterceptor` — sets `TenantId` on `EntityState.Added` from `ICurrentTenantService`

### EF Core Migrations (in order)

1. `InitialIdentity` — User, Role, Tenant, RefreshToken tables
2. `CatalogSchema` — Product, Category, Supplier tables (SKU unique index per tenant)
3. `InventorySchema` — InventoryItem, StockMovement tables
4. `SalesSchema` — Sale, SaleLine (owned entity), ConflictAlert tables
5. `RemoveProductStockQuantity` — drops `Product.StockQuantity` (single source of truth moved to `InventoryItem.CurrentStock`)

---

## Delivery Timeline

| Slice | Branch | Scope | Tasks |
|-------|--------|-------|-------|
| 0 — Scaffolding | `slice/0-scaffolding` | Solution structure, Clean Architecture projects, shared kernel, EF interceptors, Docker Compose, middleware | 13 BE + 5 FE |
| 1 — Auth Backend | `slice/1-auth-be` | ASP.NET Identity, JWT + refresh token rotation, user/tenant management | 15 |
| 2 — Catalog Backend | `slice/2-catalog-be` | Product/Category/Supplier CRUD, FluentValidation, paginated search | 13 |
| 3 — Catalog Frontend | `slice/3-catalog-fe` | Angular product/category/supplier CRUD UI with PrimeNG Table + Dialog | 9 |
| 4 — Inventory Backend | `slice/4-inventory-be` | InventoryItem + StockMovement, ingress/adjustment commands, low-stock query | 9 |
| 5 — Inventory Frontend | `slice/5-inventory-fe` | Stock dashboard, ingress/adjustment dialogs, movement history | 7 |
| 6 — Sales Backend | `slice/6-sales-be` | Sale aggregate, atomic stock deduction, void, ConflictAlert, TransactionBehavior | 22 |
| 7 — Sales + Offline | `slice/7-sales-offline-fe` | POS UI, offline queuing (Dexie.js), auto-sync, conflict alert management | 11 |
| 8 — Polish | `slice/8-polish` | Reports (BE + FE), backend i18n (.resx + IStringLocalizer), frontend i18n, rate limiting, Dockerfiles, seed data | 11 |
| **Total** | | | **104** |

---

## Key Discoveries and Gotchas

### 1. EF Core `!entityType.IsOwned()` guard is mandatory for global query filters

EF Core owned entities (e.g., `SaleLine` owned by `Sale`) do NOT have a direct query filter. If you try to apply a tenant filter to an owned entity type, EF throws at startup. The `PharmacyDbContext.BuildTenantAndSoftDeleteFilter()` method must skip owned entities:

```csharp
if (entityType.IsOwned()) continue; // MUST skip owned entities
```

This is documented inline in `PharmacyDbContext.cs` (lines 56–68). Future developers adding owned entities must be aware of this guard.

### 2. `Product.StockQuantity` was removed — `InventoryItem.CurrentStock` is the ONLY source of truth

The original design kept `StockQuantity` on `Product`. During Sales implementation it became clear that maintaining two fields in sync is error-prone. Migration `RemoveProductStockQuantity` drops the column. All stock reads go through `InventoryItem.CurrentStock`. `ProductMappings.ToDto(product, stockQuantity)` takes stock as an external parameter — callers must load the `InventoryItem` separately.

### 3. `SaleConfiguration.Ignore(l => l.Subtotal)` is intentional

`SaleLine.Subtotal` is a computed property (`Quantity * UnitPrice`). It is NOT persisted — EF `Ignore` is correct. It is always computed from the two persisted values. Queries that project `SaleDto` calculate it in-memory.

### 4. Frontend i18n: JSON files ≠ Angular compile-time XLIFF

Task 9.6 created `messages.en.json` / `messages.es.json` under `src/locale/`. These are NOT the XLIFF `.xlf` files that `@angular/localize` uses for compile-time i18n. The `ng extract-i18n` pipeline was not completed. Frontend locale switching is non-functional in v1. The files exist as a foundation but require converting to XLIFF and wiring locale-specific builds in `angular.json`. Deferred to v2.

### 5. Angular version correction during implementation

The proposal referenced Angular 21 / Angular CLI 21. The actual installed version at implementation time was Angular 19 / CLI 19. All implementation was done with Angular 19. PrimeNG version aligned to Angular 19 compatibility (no Angular 21 compatibility concern arose).

### 6. Offline sync conflict notification path is indirect

When an offline sale syncs and causes negative stock, the backend creates a `ConflictAlert` record. The `OfflineService.syncSale()` catches HTTP errors with a generic message. Users must navigate to `/sales/conflict-alerts` to see and resolve conflict details. There is no direct in-context push notification at sync time. This is a known UX gap — deferred to v2.

### 7. Receipt endpoint required a dedicated route (CRITICAL fix before archive)

The original implementation returned all sale data via `GET /api/v1/sales/{id}`. The spec required a dedicated `GET /api/v1/sales/{id}/receipt` endpoint. The fix added a thin action in `SalesController` that reuses `GetSaleByIdQuery` — the endpoint was the spec contract, not a different data shape. Frontend continued to use `GetSaleById`; the receipt endpoint satisfies the API contract for external integrations.

---

## Deferred Items (v2 Scope)

| Item | Why Deferred |
|------|-------------|
| Prescription management + controlled substance tracking | Complex regulatory domain; out of scope for basic operations |
| Payment gateway integration (Stripe, MercadoPago) | Requires external payment provider contracts |
| Azure deployment (App Service + Azure SQL) | Local Docker Compose was Phase 1; Azure is Phase 2 |
| Frontend `@angular/localize` compile-time i18n (XLIFF pipeline) | JSON files exist as foundation; locale builds require `angular.json` configuration and XLIFF conversion |
| Direct push notification for sync conflicts | Backend `ConflictAlert` exists; frontend needs WebSocket or SSE push notification at sync time |
| JWT `refresh` + `revoke` rate limiting | `login` and `register` are rate-limited; `refresh` is not — low priority hardening |
| `SaleId` FK on `StockMovement` | Improves audit traceability; currently linked via reason string only |
| Unit + integration + architecture tests | Design specifies xUnit + NSubstitute + Testcontainers + NetArchTest; implementation was manual verification only |
| Barcode/QR scanning integration | Hardware integration, out of scope |
| Email notifications and alerts | Notification infrastructure needed |
| Mobile application | Separate project scope |
| BI dashboards / advanced analytics | Reports in v1 are query-based; OLAP deferred |

---

## Files and Paths Most Important for Orientation

### Backend (under `src/backend/`)

| Path | Role |
|------|------|
| `src/PharmacySystem.Domain/Common/Entity.cs` | Base entity: Id, TenantId, audit fields, soft delete |
| `src/PharmacySystem.Domain/Common/Result.cs` | `Result<T>`, `DomainError`, `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError` |
| `src/PharmacySystem.Infrastructure/Persistence/PharmacyDbContext.cs` | Single DbContext; tenant + soft-delete query filter; `!IsOwned()` guard |
| `src/PharmacySystem.Infrastructure/Persistence/Interceptors/` | AuditInterceptor, SoftDeleteInterceptor, TenantInterceptor |
| `src/PharmacySystem.Application/Common/Behaviors/` | LoggingBehavior, ValidationBehavior, TransactionBehavior |
| `src/PharmacySystem.Application/Sales/Commands/CreateSaleCommand.cs` | Critical path: stock validation → Sale aggregate → atomic deduction |
| `src/PharmacySystem.Infrastructure/Identity/JwtTokenService.cs` | JWT generation, refresh token rotation |
| `src/PharmacySystem.Api/Program.cs` | DI registration, middleware pipeline, rate limiting, localization |
| `src/PharmacySystem.Api/Extensions/ResultExtensions.cs` | `Result<T>` → IActionResult mapping (error code → HTTP status) |
| `src/PharmacySystem.Infrastructure/Persistence/DataSeeder.cs` | Seeds demo tenant, admin@demo.com/Admin123!, pharmacist@demo.com/Pharma123! |
| `src/PharmacySystem.Application/Common/Resources/ValidationMessages.resx` | English validation messages (IStringLocalizer source) |
| `src/PharmacySystem.Application/Common/Resources/ValidationMessages.es.resx` | Spanish validation messages |

### Frontend (under `src/frontend/pharmacy-frontend/`)

| Path | Role |
|------|------|
| `src/app/core/interceptors/auth.interceptor.ts` | Injects JWT `Authorization` header |
| `src/app/core/interceptors/tenant.interceptor.ts` | Injects `X-Tenant-Id` header from auth signal |
| `src/app/core/offline/pharmacy-db.ts` | Dexie.js schema (`offlineSales` table) |
| `src/app/core/offline/offline.service.ts` | `isOnline` signal, `queueSale()`, `syncPending()`, auto-sync on reconnect |
| `src/app/features/sales/containers/pos.component.ts` | POS UI: product search, cart, offline routing |
| `src/app/features/sales/services/cart.service.ts` | Signal-based cart state (items, total, itemCount) |
| `src/app/core/components/sync-status-bar.component.ts` | Connection badge + pending count + Sync Now button |

### Deployment

| File | Role |
|------|------|
| `docker-compose.yml` | 3 services: sqlserver (1433), api (5000→8080), frontend (4200→80) |
| `docker-compose.override.yml` | Local dev overrides (volumes, env vars) |
| `src/PharmacySystem.Api/Dockerfile` | Multi-stage: sdk:10.0 build → aspnet:10.0 runtime |
| `src/frontend/pharmacy-frontend/Dockerfile` | Node build → nginx:alpine serve |

---

## How to Run Locally (Docker Compose)

### Prerequisites

- Docker Desktop running
- Ports 1433, 5000, 4200 free

### Steps

```bash
# 1. Navigate to the backend folder (where docker-compose.yml lives)
cd src/backend

# 2. Build and start all services (first run takes ~3-5 min to pull images)
docker-compose up --build

# 3. Wait for all services to be healthy:
#    - SQL Server:  "SQL Server is now ready for client connections"
#    - API:         "/health" endpoint returns 200
#    - Frontend:    nginx serving on port 4200

# 4. Open the app
# Frontend:  http://localhost:4200
# API docs:  http://localhost:5000/swagger
# Health:    http://localhost:5000/health

# 5. Login with seed credentials
# Admin:      admin@demo.com     / Admin123!
# Pharmacist: pharmacist@demo.com / Pharma123!
# (Both belong to the demo tenant — X-Tenant-Id is set automatically by the Angular interceptor)
```

### Stopping and cleaning up

```bash
docker-compose down           # stop containers, preserve DB volume
docker-compose down -v        # stop and delete DB volume (fresh start)
```

### Running individual services for development

```bash
# Backend only (requires SQL Server running separately or via docker-compose)
cd src/backend/src/PharmacySystem.Api
dotnet run

# Frontend only (requires API running at http://localhost:5000)
cd src/frontend/pharmacy-frontend
npm install
ng serve
```

---

## Spec Artifacts (Delta Specs — now archived)

These delta specs defined this change. The main `openspec/specs/` directory should be updated with these domain specs as the new source of truth:

| Domain | Spec file |
|--------|-----------|
| identity-auth | `openspec/changes/pharmacy-system/specs/identity-auth/spec.md` |
| product-catalog | `openspec/changes/pharmacy-system/specs/product-catalog/spec.md` |
| inventory-management | `openspec/changes/pharmacy-system/specs/inventory-management/spec.md` |
| sales-processing | `openspec/changes/pharmacy-system/specs/sales-processing/spec.md` |
| cross-cutting | `openspec/changes/pharmacy-system/specs/cross-cutting/spec.md` |

> **Note**: This was a greenfield project with no pre-existing `openspec/specs/` entries. These delta specs ARE the full specs. They should be copied to `openspec/specs/{domain}/spec.md` if a spec sync pass is desired.

---

## SDD Cycle Summary

| Phase | Status | Key Artifact |
|-------|--------|-------------|
| Explore | ✅ | Proposal questions answered (multi-tenancy, offline, payments) |
| Propose | ✅ | `openspec/changes/pharmacy-system/proposal.md` |
| Spec | ✅ | 5 domain specs, 27 requirements, 45 scenarios |
| Design | ✅ | 8 architecture decisions, data flows, file change map |
| Tasks | ✅ | 104 tasks across 9 slices, feature-branch-chain strategy |
| Apply | ✅ | All 104 tasks implemented, 9 delivery slices |
| Verify | ✅ | 45/45 scenarios PASS (after 2 CRITICAL post-verify fixes) |
| **Archive** | **✅** | This document |
