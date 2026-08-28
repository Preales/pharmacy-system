# Proposal: Pharmacy Management System

## Proposal Question Round

The following assumptions were derived from user answers and exploration. Review before proceeding to specs:

1. **Multi-tenant?** Assumed single-pharmacy (single tenant). If multi-pharmacy support is needed later, the modular monolith can evolve.
2. **Prescription handling?** Assumed out of scope for v1. No controlled substance tracking or prescription workflows.
3. **Payment integration?** Assumed cash/basic payment types recorded locally. No payment gateway (Stripe, MercadoPago) integration in v1.
4. **Reporting?** Assumed basic sales/inventory reports are in scope. No BI dashboards or advanced analytics in v1.
5. **Offline mode?** Assumed always-online. No offline POS capability in v1.

## Intent

A pharmacy needs a unified system to manage daily operations: selling products to customers, tracking inventory levels, and registering new products into the catalog. Currently there is no system — everything would be manual or fragmented. This system provides a secure, role-based web application where pharmacy staff can process sales with automatic stock deduction, manage inventory movements, and maintain a product catalog. The target users are pharmacy owners, pharmacists, and sales clerks.

## Scope

### In Scope
- JWT authentication with role-based authorization (Admin, Pharmacist, Clerk)
- User registration and management (ASP.NET Identity)
- Product catalog CRUD (products, categories, suppliers)
- Inventory management (stock levels, entries, adjustments)
- Sales processing (create sale, line items, automatic stock deduction)
- API versioning (`/api/v1/`)
- i18n support (frontend and backend error messages)
- Azure deployment target (App Service + Azure SQL)

### Out of Scope
- Prescription management and controlled substance tracking
- Payment gateway integration (Stripe, MercadoPago)
- Multi-tenant / multi-pharmacy support
- BI dashboards or advanced analytics
- Offline/POS mode
- Mobile application
- Email notifications or alerts
- Barcode/QR scanning integration

## Capabilities

### New Capabilities
- `identity-auth`: User registration, login, JWT issuance, role management, route protection
- `product-catalog`: Product CRUD, category management, supplier management
- `inventory-management`: Stock tracking, stock entries, adjustments, low-stock queries
- `sales-processing`: Sale creation, line items, receipt generation, stock deduction on sale

### Modified Capabilities
None — greenfield project, no existing specs.

## Approach

Modular monolith with Clean Architecture. Backend: .NET 10 Web API, DDD with 4 bounded contexts (Identity, Catalog, Inventory, Sales), CQRS via MediatR, EF Core with audit/soft-delete interceptors, Result pattern, JWT auth, SQL Server. Frontend: Angular 21 standalone components with signals, PrimeNG, lazy-loaded feature modules, container-presentational pattern, functional HTTP interceptors/guards. Structure under `/src/backend` and `/src/frontend`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/backend/` | New | .NET 10 solution with Clean Architecture layers |
| `src/frontend/` | New | Angular 21 app with PrimeNG |
| `openspec/config.yaml` | Modified | Update tech stack context |
| `openspec/specs/` | New | Domain specs per bounded context |

## Delivery Slices

Respecting 400-line review budget. Each slice is a self-contained, deployable increment:

| Slice | Scope | Estimated Size |
|-------|-------|---------------|
| 0 — Scaffolding | Solution structure, EF Core setup, shared kernel, global error handling, Result pattern, interceptors, base config | ~300 lines |
| 1 — Identity/Auth | ASP.NET Identity, JWT auth, login/register endpoints, auth guards, login UI | ~350 lines |
| 2 — Catalog (Backend) | Product/Category/Supplier entities, CQRS handlers, API endpoints | ~350 lines |
| 3 — Catalog (Frontend) | Product listing, CRUD forms, PrimeNG table/dialog | ~350 lines |
| 4 — Inventory (Backend) | Stock entities, movements, entry/adjustment handlers, API | ~300 lines |
| 5 — Inventory (Frontend) | Stock dashboard, entry forms, low-stock view | ~300 lines |
| 6 — Sales (Backend) | Sale aggregate, line items, stock deduction, receipt | ~350 lines |
| 7 — Sales (Frontend) | POS-style sale form, receipt view, sales history | ~350 lines |
| 8 — Polish | i18n setup, API versioning finalization, deployment config, docs | ~200 lines |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep across 4 bounded contexts | High | Strict slice boundaries; each slice is independently reviewable |
| Angular 21 + PrimeNG compatibility | Medium | Verify PrimeNG supports Angular 21 before slice 3 |
| EF Core interceptor complexity | Low | Use well-documented interceptor patterns; unit test interceptors early |
| JWT refresh token flow complexity | Medium | Start with simple JWT (no refresh) in slice 1; add refresh in a follow-up |
| Cross-context domain events | Low | Defer domain events between contexts until Sales slice needs stock deduction |

## Rollback Plan

Each delivery slice is a separate PR on a feature branch chain. Rollback = revert the specific PR. The modular monolith structure means each bounded context is isolated — removing a context does not break others. Database rollback via EF Core migrations (each slice has its own migration).

## Dependencies

- .NET 10 SDK (installed: 10.0.103)
- Angular CLI 21 (installed: 21.2.14)
- Node.js 22 (installed: 22.22.2)
- SQL Server instance (Azure SQL for production, LocalDB or Docker for dev)
- PrimeNG compatible with Angular 21

## Success Criteria

- [ ] Users can register, login, and receive JWT tokens
- [ ] Admin can manage products, categories, and suppliers
- [ ] Staff can view and adjust inventory levels
- [ ] Clerk can process a sale and see stock auto-deducted
- [ ] All endpoints versioned under `/api/v1/`
- [ ] Frontend supports i18n (at minimum Spanish + English)
- [ ] Deployed to Azure (App Service + Azure SQL)
- [ ] Each PR stays within 400-line review budget
