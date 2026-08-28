# Delta for Cross-Cutting

> Issues: 2, 4, 6, 8, 9, 10

## ADDED Requirements

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

The system MUST define `PagedResult<T>` in `core/models/paged-result.model.ts`. This is the single canonical location for the type. All bounded contexts (catalog, inventory, sales) MUST import `PagedResult<T>` from `core/models/`. No cross-feature imports from `catalog/models/` for shared types are permitted.

#### Scenario: Shared model imported from core

- GIVEN any component or service that uses `PagedResult<T>`
- WHEN the import is resolved
- THEN it points to `core/models/paged-result.model`
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

## REMOVED Requirements

### Requirement: Dead i18n Locale Files

(Reason: `src/locale/messages.es.json` and `src/locale/messages.en.json` are unused artifacts — no Angular i18n extraction or compilation references them; they create false confidence that i18n is wired when it is not)
(Migration: delete both files; full i18n wiring is deferred to a future change; backend `.resx` files and the cross-cutting i18n requirement remain valid and are unaffected)

## MODIFIED Requirements

### Requirement: Internationalization (i18n)

Backend error messages and validation messages MUST use resource files (.resx) with `IStringLocalizer<T>`. Frontend MUST use Angular's built-in i18n or `@ngx-translate/core`. Supported locales in v1: `es` (Spanish, default), `en` (English). All PrimeNG component labels MUST be translatable. API responses MUST include error messages in the requested locale (via `Accept-Language` header). Frontend locale extraction files (`messages.es.json`, `messages.en.json`) MUST NOT exist in `src/locale/` until Angular i18n is fully wired and XLF extraction is configured.
(Previously: dead `messages.es.json` and `messages.en.json` files were present in `src/locale/` without being wired to Angular i18n compilation)

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
