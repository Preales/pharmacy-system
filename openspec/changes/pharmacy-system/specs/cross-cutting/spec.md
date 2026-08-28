# Cross-Cutting Concerns Specification

## Purpose

Defines shared infrastructure concerns that span all bounded contexts: multi-tenancy, offline support, i18n, error handling, audit, DTO mapping, and reporting.

## Requirements

### Requirement: Multi-Tenancy Infrastructure

Every domain entity (except global lookups) MUST include a `TenantId` column. EF Core MUST apply a global query filter `WHERE TenantId = @currentTenant` on all tenant-scoped entities. TenantId MUST be resolved from JWT claims via a scoped `ITenantProvider` service. The API MUST NOT accept TenantId as a request parameter.

#### Scenario: Automatic tenant filtering

- GIVEN a query for products
- WHEN EF Core executes the query
- THEN a WHERE clause for TenantId is automatically applied
- AND no manual filtering is needed in repository code

#### Scenario: Tenant injection on create

- GIVEN a new entity is being saved
- WHEN `SaveChangesAsync` is called
- THEN the EF Core interceptor sets TenantId from ITenantProvider automatically

### Requirement: Offline Support Infrastructure

The Angular app MUST detect connectivity status using the Network Information API (with fallback to `navigator.onLine`). An `OfflineQueueService` MUST manage IndexedDB storage for pending operations. Sync MUST be triggered automatically on reconnect and MAY be triggered manually. Only sales transactions are queued offline in v1. The UI MUST show a visual indicator of offline status.

#### Scenario: Connectivity detection

- GIVEN the app is running
- WHEN network is lost
- THEN the offline indicator is displayed
- AND write operations are routed to the offline queue

#### Scenario: Manual sync trigger

- GIVEN pending items in the offline queue
- WHEN the user clicks "Sync Now"
- THEN all pending items are submitted to the API

### Requirement: Internationalization (i18n)

Backend error messages and validation messages MUST use resource files (.resx) with `IStringLocalizer<T>`. Frontend MUST use Angular's built-in i18n or `@ngx-translate/core`. Supported locales in v1: `es` (Spanish, default), `en` (English). All PrimeNG component labels MUST be translatable. API responses MUST include error messages in the requested locale (via `Accept-Language` header).

#### Scenario: Spanish error message

- GIVEN a user with `Accept-Language: es`
- WHEN they submit an invalid product (missing name)
- THEN error message is "El nombre del producto es obligatorio"

#### Scenario: English error message

- GIVEN a user with `Accept-Language: en`
- WHEN they submit an invalid product (missing name)
- THEN error message is "Product name is required"

#### Scenario: Frontend locale switch

- GIVEN the UI is displayed in Spanish
- WHEN the user switches locale to English
- THEN all labels, messages, and PrimeNG components re-render in English

### Requirement: Global Error Handling

The API MUST use a global exception handler middleware. All error responses MUST follow RFC 7807 (ProblemDetails). Business logic errors MUST use the Result pattern — never throw exceptions for expected failures. Unhandled exceptions MUST be logged with Serilog and return HTTP 500 with a generic ProblemDetails.

#### Scenario: Business validation error

- GIVEN a command that fails validation
- WHEN the Result pattern returns a failure
- THEN HTTP 400 with ProblemDetails (type, title, detail, errors array) is returned

#### Scenario: Unhandled exception

- GIVEN an unexpected infrastructure error
- WHEN the exception reaches the middleware
- THEN HTTP 500 with generic ProblemDetails is returned
- AND the full exception is logged via Serilog (not exposed to client)

### Requirement: Audit Trail

EF Core `SaveChangesInterceptor` MUST automatically set `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy` on all auditable entities. `CreatedBy`/`UpdatedBy` MUST be resolved from the current user's JWT claims. Soft delete MUST set `IsDeleted = true` and `DeletedAt` via interceptor — never hard delete.

#### Scenario: Audit fields on create

- GIVEN a new product being created by user "admin@farm.com"
- WHEN SaveChanges is called
- THEN CreatedAt = now, CreatedBy = "admin@farm.com", UpdatedAt = now

#### Scenario: Soft delete behavior

- GIVEN a product marked for deletion
- WHEN SaveChanges processes the delete
- THEN IsDeleted = true, DeletedAt = now
- AND the entity remains in the database

### Requirement: Manual DTO Mapping Convention

All DTO-to-Entity and Entity-to-DTO mapping MUST use extension methods. Extension methods MUST be defined on the DTO type in the Application layer (e.g., `public static Product ToEntity(this CreateProductDto dto)`). AutoMapper and Mapster MUST NOT be referenced in the project. Collection mappings MUST use LINQ `.Select(x => x.ToDto())`.

#### Scenario: Extension method mapping

- GIVEN a `ProductDto` class in the Application layer
- WHEN mapping is needed in a query handler
- THEN `product.ToDto()` extension method is used
- AND no reflection-based mapper is present in the dependency graph
