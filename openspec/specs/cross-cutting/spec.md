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

Backend error messages and validation messages MUST use resource files (.resx) with `IStringLocalizer<T>`. Frontend MUST use Angular's built-in i18n or `@ngx-translate/core`. Supported locales in v1: `es` (Spanish, default), `en` (English). All PrimeNG component labels MUST be translatable. API responses MUST include error messages in the requested locale (via `Accept-Language` header). Frontend locale extraction files (`messages.es.json`, `messages.en.json`) MUST NOT exist in `src/locale/` until Angular i18n is fully wired and XLF extraction is configured.

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

#### Scenario: No dead locale files

- GIVEN the `src/locale/` directory
- WHEN it is inspected
- THEN `messages.es.json` and `messages.en.json` are absent
- AND no build step references them

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

### Requirement: Application Constants

The system MUST provide a single `AppConstants` module (`core/constants/app.constants.ts`) that exports `AppRoles`, `AppStatus`, and `Pagination` constant objects. All components and services that reference role names, status values, or pagination defaults MUST import from this module. Hardcoded string literals for roles, statuses, and pagination sizes MUST NOT appear outside this file.

#### Scenario: Role constant used in guard

- GIVEN a route or UI guard that checks for Admin access
- WHEN the guard is evaluated
- THEN it reads `AppRoles.ADMIN` from `app.constants.ts`
- AND the literal string `'Admin'` does not appear in the guard code

#### Scenario: Constants file is the single source of truth

- GIVEN a developer searches the codebase for `'Pharmacist'` string literal
- WHEN the search runs
- THEN zero occurrences appear outside `app.constants.ts`

### Requirement: Global Shared CSS Utilities

The system MUST define `.form-body`, `.field`, and `.page-header` CSS utility classes in the global `src/styles.scss`. Components MUST NOT re-declare these classes in component-scoped stylesheets. Layout is consistent across all form and list views.

#### Scenario: Form layout uses global class

- GIVEN a form component rendered in the browser
- WHEN DevTools inspect the `.form-body` element
- THEN the style resolves from `styles.scss` (global), not a component-scoped stylesheet

#### Scenario: No duplicate declarations

- GIVEN a developer searches component stylesheets for `.form-body`
- WHEN the search runs
- THEN zero component-scoped `.form-body` declarations are found

### Requirement: PagedResult Core Model

The system MUST define `PagedResult<T>` in `core/models/shared.models.ts`. This is the single canonical location for the type. All bounded contexts (catalog, inventory, sales) MUST import `PagedResult<T>` from `core/models/`. No cross-feature imports from `catalog/models/` for shared types are permitted.

#### Scenario: Shared model imported from core

- GIVEN any component or service that uses `PagedResult<T>`
- WHEN the import is resolved
- THEN it points to `core/models/shared.models`
- AND no import points to `catalog/models/paged-result.model`

### Requirement: Dependency Vulnerability Mitigation

The system MUST NOT ship with known high/critical vulnerabilities in its dependency tree. The `glob` v7 transitive vulnerability MUST be resolved via a `package.json` `overrides` entry pinning `glob` to a non-vulnerable version. `ng build` and `ng serve` MUST succeed after the override is applied.

#### Scenario: npm audit reports no glob v7 vulnerability

- GIVEN `glob` override is applied in `package.json`
- WHEN `npm audit` is run
- THEN no `glob@7.x` vulnerability is reported in the output

#### Scenario: Build succeeds with override

- GIVEN the `glob` override is in place
- WHEN `ng build` runs
- THEN the build completes without errors related to the glob resolution

### Requirement: Swagger JWT Authorization

The backend Swagger UI MUST include a JWT Bearer `SecurityDefinition` and a global `SecurityRequirement`. The Swagger UI MUST display an "Authorize" button. Authenticated API calls tested via Swagger MUST include the `Authorization: Bearer <token>` header.

#### Scenario: Authorize button visible

- GIVEN the backend is running and Swagger UI is opened
- WHEN the page loads
- THEN an "Authorize" button is visible in the top-right of the Swagger UI

#### Scenario: Bearer token applied to requests

- GIVEN a user clicks "Authorize" and enters a valid JWT
- WHEN they execute a secured endpoint (e.g., GET /api/v1/products)
- THEN the request includes `Authorization: Bearer <token>`
- AND the endpoint responds with 200 (not 401)
