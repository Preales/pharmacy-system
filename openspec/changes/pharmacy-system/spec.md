# Specs: pharmacy-system

## Overview

Full specs for a greenfield multi-tenant pharmacy management system. 5 bounded contexts, all new capabilities.

## Domains Specified

| Domain | Type | Requirements | Scenarios |
|--------|------|-------------|-----------|
| identity-auth | New | 5 (Tenant Mgmt, Registration, JWT Auth, RBAC, Route Protection) | 9 |
| product-catalog | New | 5 (Product CRUD, Categories, Suppliers, Search/Filter, DTO Mapping) | 8 |
| inventory-management | New | 5 (Stock Tracking, Ingress, Adjustments, Audit Trail, Reporting) | 7 |
| sales-processing | New | 6 (Sale Creation, Stock Deduction, Voiding, Receipts, Reporting, Offline) | 10 |
| cross-cutting | New | 6 (Multi-tenancy, Offline Infra, i18n, Error Handling, Audit, DTO Convention) | 11 |
| **Totals** | | **27 requirements** | **45 scenarios** |

## Key Design Decisions Reflected

- Multi-tenant isolation via EF Core global query filters + JWT TenantId claim
- Manual DTO mapping via extension methods (NO AutoMapper/Mapster)
- Offline support scoped to sales transactions in v1 (IndexedDB + auto-sync)
- i18n: backend .resx + IStringLocalizer, frontend ngx-translate, Accept-Language header
- Reports: inventory summary + sales reports (daily/weekly/monthly)
- Result pattern for business errors, ProblemDetails (RFC 7807) for API errors
- Audit via EF Core SaveChangesInterceptor (CreatedAt/By, UpdatedAt/By, soft delete)
- Deployment phase 1: Docker Compose local (SQL Server container), Azure deferred

## Spec File Locations

- `openspec/changes/pharmacy-system/specs/identity-auth/spec.md`
- `openspec/changes/pharmacy-system/specs/product-catalog/spec.md`
- `openspec/changes/pharmacy-system/specs/inventory-management/spec.md`
- `openspec/changes/pharmacy-system/specs/sales-processing/spec.md`
- `openspec/changes/pharmacy-system/specs/cross-cutting/spec.md`

## Coverage

- Happy paths: All 27 requirements covered
- Edge cases: Covered (duplicate SKU, insufficient stock, cross-tenant isolation, sync conflicts, soft delete constraints)
- Error states: Covered (auth failures, validation errors, unhandled exceptions, offline sync failures)

## Risks

- Offline sync conflict resolution may need refinement when real usage patterns emerge
- Multi-tenant super-admin flow (tenant creation) needs deployment-time seeding strategy
- Report performance at scale may require read-optimized views/materialized queries
