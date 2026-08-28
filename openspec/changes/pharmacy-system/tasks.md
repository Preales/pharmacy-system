# Tasks: Pharmacy Management System

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,800–3,200 (9 slices, greenfield) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 9 PRs (one per delivery slice) |
| Delivery strategy | ask-always |
| Chain strategy | pending (user must choose) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Chain Strategy Options (user must choose one)

1. **Stacked PRs to main** — each slice merges directly to main in order. Fast iteration.
2. **Feature Branch Chain** — PR #1 targets `feature/pharmacy-system`, subsequent PRs target the previous PR branch. Only the tracker merges to main.
3. **size:exception** — single mega-PR with maintainer approval. NOT recommended for ~3K lines.

### Suggested Work Units

| Unit | Goal | Likely PR | Est. Lines | Notes |
|------|------|-----------|------------|-------|
| 1 | Scaffolding + shared kernel | PR 1 | ~300 | Base: main or feature/pharmacy-system |
| 2 | Auth backend | PR 2 | ~350 | Depends on PR 1 |
| 3 | Catalog backend | PR 3 | ~350 | Depends on PR 1 |
| 4 | Catalog frontend | PR 4 | ~350 | Depends on PR 3 |
| 5 | Inventory backend | PR 5 | ~300 | Depends on PR 1, PR 3 |
| 6 | Inventory frontend | PR 6 | ~300 | Depends on PR 5 |
| 7 | Sales backend | PR 7 | ~380 | Depends on PR 3, PR 5 |
| 8 | Sales frontend + offline | PR 8 | ~380 | Depends on PR 7 |
| 9 | Polish (i18n, reports, cleanup) | PR 9 | ~250 | Depends on all prior |

---

## Phase 1: Scaffolding (Slice 0) — ~300 lines

- [x] 1.1 Create `src/backend/PharmacySystem.sln`, `Directory.Build.props` with nullable, implicit usings, .NET 10 target
- [x] 1.2 Create 4 projects: `PharmacySystem.Domain`, `.Application`, `.Infrastructure`, `.Api` with correct project references (Domain→none, App→Domain, Infra→App+Domain, Api→all)
- [x] 1.3 Create `Domain/Common/Entity.cs` (Id, TenantId, CreatedAt, UpdatedAt, CreatedBy, IsDeleted, DeletedAt), `AggregateRoot.cs`, `ValueObject.cs`
- [x] 1.4 Create `Domain/Common/Result.cs` — `Result<T>` with Success/Failure, `DomainError`, `ValidationError`, `NotFoundError`, `ConflictError` records
- [x] 1.5 Create `Domain/Common/Interfaces/ICurrentTenantService.cs`, `ICurrentUserService.cs`
- [x] 1.6 Create `Infrastructure/Persistence/PharmacyDbContext.cs` — empty DbContext with `BuildTenantFilter()` + soft-delete global query filter
- [x] 1.7 Create `Infrastructure/Persistence/Interceptors/AuditInterceptor.cs`, `SoftDeleteInterceptor.cs`, `TenantInterceptor.cs`
- [x] 1.8 Create `Api/Program.cs` with Serilog, CORS, health checks, Swagger, MediatR, EF Core DI registration
- [x] 1.9 Create `Api/Middleware/ExceptionHandlingMiddleware.cs` — global exception → ProblemDetails (RFC 7807)
- [x] 1.10 Create `Api/Middleware/TenantMiddleware.cs` — resolve `X-Tenant-Id` header → `ICurrentTenantService`
- [x] 1.11 Create `Api/Extensions/ResultExtensions.cs` — `Result<T>` → IActionResult mapping
- [x] 1.12 Create `docker-compose.yml` + `docker-compose.override.yml` — SQL Server 2022 container, API service, frontend service
- [x] 1.13 Create `Api/appsettings.json` + `appsettings.Development.json` with JWT config, connection strings

**Verification**: `dotnet build` succeeds. Docker Compose starts SQL Server. API boots and returns `/health` OK. Swagger UI accessible.

---

## Phase 2: Auth Backend (Slice 1) — ~350 lines

- [x] 2.1 Create `Domain/Identity/User.cs` (extends Entity), `Role.cs`, `Tenant.cs` entities
- [x] 2.2 Create `Domain/Identity/RefreshToken.cs` entity with Token, ExpiresAt, IsRevoked, ReplacedByToken fields
- [x] 2.3 Create `Application/Identity/DTOs/` — `LoginRequest`, `RegisterRequest`, `AuthResponse` (token + refresh token + expiry), `UserDto`
- [x] 2.4 Create `Application/Identity/Mappings/UserMappings.cs` — manual extension methods `.ToDto()`, `.ToDomain()`
- [x] 2.5 Create `Application/Identity/Commands/RegisterCommand.cs` + handler — ASP.NET Identity user creation, tenant-scoped email uniqueness, default Clerk role
- [x] 2.6 Create `Application/Identity/Commands/LoginCommand.cs` + handler — credential validation, JWT + refresh token generation
- [x] 2.7 Create `Application/Identity/Commands/RefreshTokenCommand.cs` + handler — rotation on each use, revoke old token
- [x] 2.8 Create `Application/Identity/Commands/CreateTenantCommand.cs` + handler — super-admin tenant provisioning + default admin user
- [x] 2.9 Create `Application/Identity/Queries/GetUsersQuery.cs` + handler — tenant-scoped user list (Admin only)
- [x] 2.10 Create `Infrastructure/Identity/JwtTokenService.cs` — JWT generation with sub, tenantId, roles claims; refresh token generation + rotation
- [x] 2.11 Create `Infrastructure/Identity/CurrentTenantService.cs`, `CurrentUserService.cs` — resolve from HttpContext/JWT claims
- [x] 2.12 Create `Infrastructure/Persistence/Configurations/Identity/` — EF configs for User, Role, Tenant, RefreshToken
- [x] 2.13 Create `Api/Controllers/V1/AuthController.cs` — login, register, refresh, tenant creation endpoints under `/api/v1/auth/`
- [x] 2.14 Create `Api/Controllers/V1/UsersController.cs` — user management (Admin only) under `/api/v1/users/`
- [x] 2.15 Add JWT Bearer authentication + role authorization policies to `Program.cs`

**Verification**: POST `/api/v1/auth/register` creates user. POST `/api/v1/auth/login` returns JWT. Token includes tenantId claim. POST `/api/v1/auth/refresh` rotates refresh token. GET `/api/v1/users` returns 403 for non-Admin. Cross-tenant queries return empty. Covers spec scenarios: register, duplicate email, login, invalid credentials, clerk auth, admin manages users.

---

## Phase 3: Catalog Backend (Slice 2) — ~350 lines

- [x] 3.1 Create `Domain/Catalog/Product.cs` — Name, SKU, Description, UnitPrice, Barcode, IsActive, CategoryId, SupplierId
- [x] 3.2 Create `Domain/Catalog/Category.cs` — Name, Description, ParentCategoryId (nullable, hierarchical)
- [x] 3.3 Create `Domain/Catalog/Supplier.cs` — Name, ContactEmail, Phone, Address
- [x] 3.4 Create `Application/Catalog/DTOs/` — ProductDto, CategoryDto, SupplierDto, CreateProductCommand, UpdateProductCommand, etc.
- [x] 3.5 Create `Application/Catalog/Mappings/ProductMappings.cs`, `CategoryMappings.cs`, `SupplierMappings.cs` — manual extension methods
- [x] 3.6 Create `Application/Catalog/Commands/` — CreateProduct, UpdateProduct, DeleteProduct handlers (with SKU uniqueness per tenant, soft delete, category-has-products guard)
- [x] 3.7 Create `Application/Catalog/Commands/` — CreateCategory, UpdateCategory, DeleteCategory, CreateSupplier, UpdateSupplier, DeleteSupplier handlers
- [x] 3.8 Create `Application/Catalog/Queries/` — GetProducts (paginated, search by name/SKU/barcode, filter by category/status/supplier), GetProductById, GetCategories, GetSuppliers
- [x] 3.9 Create `Application/Common/Behaviors/ValidationBehavior.cs` + FluentValidation validators for catalog commands
- [x] 3.10 Create `Infrastructure/Persistence/Configurations/Catalog/` — EF configs for Product, Category, Supplier (SKU unique index per tenant)
- [x] 3.11 Create `Api/Controllers/V1/ProductsController.cs` — full CRUD + search/filter under `/api/v1/products/`
- [x] 3.12 Create `Api/Controllers/V1/CategoriesController.cs`, `SuppliersController.cs` — CRUD under `/api/v1/categories/`, `/api/v1/suppliers/`
- [x] 3.13 Add role policies: Admin/Pharmacist for write, all authenticated for read

**Verification**: CRUD for products, categories, suppliers works. SKU duplicate returns 400. Delete category with products returns 400. Soft delete hides product from GET. Pagination returns 20/page. Cross-tenant isolation verified. Covers spec scenarios: create/delete product, SKU uniqueness, category management, supplier CRUD, search/filter.

---

## Phase 4: Catalog Frontend (Slice 3) — ~350 lines

- [x] 4.1 Scaffold Angular 21 app: `ng new pharmacy-frontend --standalone --style=scss --routing` under `src/frontend/` *(done in Slice 0)*
- [x] 4.2 Install + configure PrimeNG (Material theme preset), `@angular/localize`, Dexie.js *(done in Slice 0, Dexie.js deferred to Slice 7)*
- [x] 4.3 Create `core/interceptors/auth.interceptor.ts`, `tenant.interceptor.ts`, `error.interceptor.ts` — functional HTTP interceptors *(done in Slice 0)*
- [x] 4.4 Create `core/guards/auth.guard.ts`, `role.guard.ts` — functional route guards *(auth.guard done in Slice 0, role.guard deferred)*
- [x] 4.5 Create `core/services/auth.service.ts` — login, register, token storage, refresh token rotation, currentTenantId signal
- [x] 4.6 Create `shared/models/` — Product, Category, Supplier, ApiResponse, PaginatedResult TypeScript interfaces
- [x] 4.7 Create `features/auth/` — LoginComponent (container), LoginFormComponent (presentational), RegisterComponent, routes
- [x] 4.8 Create `features/catalog/services/catalog-store.service.ts` — signals-based store for products, categories, suppliers
- [x] 4.9 Create `features/catalog/containers/product-list.component.ts` — container with PrimeNG Table (paginated, search, filter)
- [x] 4.10 Create `features/catalog/components/product-form.component.ts` — PrimeNG Dialog form (create/edit), typed reactive form
- [x] 4.11 Create `features/catalog/containers/category-list.component.ts`, `components/category-form.component.ts`
- [x] 4.12 Create `features/catalog/containers/supplier-list.component.ts`, `components/supplier-form.component.ts`
- [x] 4.13 Create `app.routes.ts` — lazy-loaded routes with auth/role guards, `app.config.ts` — providers *(done in Slice 0)*

**Verification**: Login form authenticates, stores JWT. Products page lists with pagination. Create/edit/delete product via dialog. Category/supplier CRUD works. Unauthenticated redirects to login. Covers spec scenarios: route protection, DTO mapping (via typed interfaces), CRUD flows.

---

## Phase 5: Inventory Backend (Slice 4) — ~300 lines

- [x] 5.1 Create `Domain/Inventory/InventoryItem.cs` — ProductId, CurrentStock, LowStockThreshold (default 10)
- [x] 5.2 Create `Domain/Inventory/StockMovement.cs` — MovementType (Ingress/Sale/Adjustment), Quantity, Reason, BatchNumber, SupplierId, UserId, Timestamp. Immutable (no update/delete).
- [x] 5.3 Create `Application/Inventory/DTOs/` — InventoryItemDto, StockMovementDto, RecordIngressCommand, CreateAdjustmentCommand
- [x] 5.4 Create `Application/Inventory/Mappings/InventoryMappings.cs` — manual extension methods
- [x] 5.5 Create `Application/Inventory/Commands/RecordIngressHandler.cs` — create StockMovement(Ingress), update CurrentStock, optional BatchNumber/SupplierId
- [x] 5.6 Create `Application/Inventory/Commands/CreateAdjustmentHandler.cs` — create StockMovement(Adjustment), update CurrentStock, require Reason. Admin/Pharmacist only.
- [x] 5.7 Create `Application/Inventory/Queries/` — GetInventoryItem, GetLowStockItems (below threshold), GetMovementHistory (by productId, paginated chronological)
- [x] 5.8 Create `Infrastructure/Persistence/Configurations/Inventory/` — EF configs for InventoryItem, StockMovement
- [x] 5.9 Create `Api/Controllers/V1/InventoryController.cs` — stock query, ingress, adjustment, low-stock, movement history

**Verification**: Record ingress increases stock. Adjustment with reason works. Low-stock endpoint returns items below threshold. Movement history is chronological and immutable. Clerk gets 403 on adjustments. Covers spec scenarios: stock tracking, ingress, batch number, adjustments, audit trail, low-stock query.

---

## Phase 6: Inventory Frontend (Slice 5) — ~300 lines

- [x] 6.1 Create `features/inventory/services/inventory-store.service.ts` — signals-based store for inventory items and movements
- [x] 6.2 Create `features/inventory/containers/inventory-dashboard.component.ts` — PrimeNG Table with current stock, low-stock badge, search
- [x] 6.3 Create `features/inventory/components/ingress-form.component.ts` — PrimeNG Dialog for stock entry (product, quantity, supplier, batch)
- [x] 6.4 Create `features/inventory/components/adjustment-form.component.ts` — PrimeNG Dialog for adjustment (quantity, reason)
- [x] 6.5 Create `features/inventory/containers/movement-history.component.ts` — PrimeNG Table showing movement timeline per product
- [x] 6.6 Create `features/inventory/containers/low-stock.component.ts` — dedicated low-stock view with PrimeNG DataView
- [x] 6.7 Add inventory routes to `app.routes.ts` with role guards (Admin/Pharmacist for write, all for read)

**Verification**: Inventory dashboard shows stock levels. Ingress form records entry, stock updates. Adjustment form requires reason. Movement history shows chronological list. Low-stock view filters correctly. Covers spec scenarios: view stock, record ingress, adjustments, audit trail display.

---

## Phase 7: Sales Backend (Slice 6) — ~380 lines

- [x] 7.1 Create `Domain/Sales/Sale.cs` aggregate — SaleNumber, SaleDate, TotalAmount, Status (Completed/Voided), list of SaleItems
- [x] 7.2 Create `Domain/Sales/SaleLine.cs` — ProductId, ProductName (snapshot), Quantity, UnitPrice (snapshot), Subtotal
- [x] 7.3 Create `Application/Sales/DTOs/` — SaleDto, SaleLineDto, SaleSummaryDto, ConflictAlertDto
- [x] 7.4 Create `Application/Sales/Mappings/SalesMappings.cs` — manual extension methods ToDto()
- [x] 7.5 Create `Application/Sales/Commands/CreateSaleCommand.cs` — validate stock per item, create Sale + SaleLines, deduct stock (StockMovement type Sale), atomic transaction via ITransactionalCommand + TransactionBehavior; offline sync creates ConflictAlert if negative stock
- [x] 7.6 Create `Application/Sales/Commands/VoidSaleCommand.cs` — Admin only, set status Voided, restore stock via reverse StockMovements (Adjustment), resolves open ConflictAlerts
- [x] 7.7 Create `Application/Sales/Queries/SalesQueries.cs` + `ConflictAlertsQueries.cs` — GetSales (paginated/filtered), GetSaleById, GetConflictAlerts (paginated), GetSalesSummary (totals/revenue/avg)
- [x] 7.8 Create `Application/Common/Behaviors/TransactionBehavior.cs` — MediatR pipeline behavior + ITransactionalCommand marker interface
- [x] 7.9 Create `Application/Common/Behaviors/LoggingBehavior.cs` — request/response structured logging with timing
- [x] 7.10 Create `Infrastructure/Persistence/Configurations/Sales/` — EF configs for Sale (with OwnsMany SaleLines), ConflictAlert; SaleNumber service
- [x] 7.11 Create `Api/Controllers/V1/SalesController.cs` + `ConflictAlertsController.cs` — full CRUD + void + summary + conflict resolution under `/api/v1/sales/` and `/api/v1/conflict-alerts/`

**Verification**: Create sale with items deducts stock atomically. Insufficient stock returns 400 + rolls back. Void sale restores stock. Receipt endpoint returns line items + totals. Cross-tenant isolation verified. Covers spec scenarios: sale creation, stock deduction, atomicity, voiding, receipt generation.

---

## Phase 8: Sales Frontend + Offline (Slice 7) — ~380 lines

- [x] 8.1 Create `core/offline/pharmacy-db.ts` — Dexie.js PharmacyDb class (offlineSales table: ++id, tenantId, createdAt, synced)
- [x] 8.2 Create `core/offline/offline.service.ts` — isOnline signal, pendingCount computed, queueSale(), syncPending(), auto-sync on reconnect via effect()
- [x] 8.3 Offline connectivity detection embedded in OfflineService via navigator.onLine + window online/offline events
- [x] 8.4 Create `core/components/sync-status-bar.component.ts` — connection badge, pending count, "Sync Now" button
- [x] 8.5 Create `features/sales/services/sales.service.ts` + `cart.service.ts` + `conflict-alerts.service.ts` — signal-based stores routing to API or Dexie based on connectivity
- [x] 8.6 Create `features/sales/containers/pos.component.ts` — product grid search, cart panel, offline banner, Complete Sale with online/offline routing
- [x] 8.7 Cart state managed via `CartService` signals (items, total, itemCount) — inline in POS
- [x] 8.8 Create `features/sales/containers/sales-history.component.ts` — p-table, date/status filters, row expand for lines, Void admin action
- [x] 8.9 Create `features/sales/containers/sale-detail.component.ts` — receipt-style view, print button, Void admin action
- [x] 8.10 Create `features/sales/containers/conflict-alerts.component.ts` — p-table, unresolved toggle filter, Resolve admin action
- [x] 8.11 Updated `sales-shell.component.ts` with sidebar nav + SyncStatusBar; updated `sales.routes.ts` with pos/history/:id/conflict-alerts children

**Verification**: POS creates sale online, stock updates. Offline mode queues sale in IndexedDB, shows indicator. Reconnect syncs queued sales (FIFO). Sync conflict creates alert. Sales history shows all statuses. Receipt view renders. Covers spec scenarios: sale creation, offline queuing, sync on reconnect, sync conflict, receipt display.

---

## Phase 9: Polish (Slice 8) — ~250 lines

- [x] 9.1 Create `Application/Reports/Queries/DailySalesReportQuery.cs` + handler — total revenue, transaction count, top products by period
- [x] 9.2 Create `Application/Reports/Queries/InventorySummaryQuery.cs` + handler — total products, stock value, low-stock count
- [x] 9.3 Create `Api/Controllers/V1/ReportsController.cs` — `/api/v1/reports/sales`, `/api/v1/reports/inventory-summary`
- [x] 9.4 Create `features/reports/containers/sales-report.component.ts` — PrimeNG Chart (daily/weekly/monthly), PrimeNG Table for top products
- [x] 9.5 Create `features/reports/containers/inventory-report.component.ts` — summary cards + low-stock list
- [x] 9.6 Configure `@angular/localize` — extract XLIFF, add `es` + `en` translation files, locale-specific builds
- [x] 9.7 Add backend `.resx` files for validation/error messages (es + en), wire `IStringLocalizer` in validation behaviors
- [x] 9.8 Add `Accept-Language` header handling in API middleware, configure `RequestLocalizationMiddleware`
- [x] 9.9 Add rate limiting on auth endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`) in `Program.cs`
- [x] 9.10 Create `Api/Dockerfile` (multi-stage build), `src/frontend/Dockerfile`, update `docker-compose.yml` with frontend service
- [x] 9.11 Seed script: create default super-admin tenant + admin user on first `docker-compose up`

**Verification**: Sales report returns period-based data. Inventory summary returns valuation. i18n: Spanish error on `Accept-Language: es`, English on `en`. Frontend renders in both locales. Rate limiter throttles after threshold. Docker Compose runs full stack. Covers spec scenarios: reporting queries, i18n messages, locale switch, error handling.
