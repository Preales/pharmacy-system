# Spec: Frontend Polish and Fixes

> Change: `frontend-polish-and-fixes` | Issues: 1, 2, 4, 5, 6, 7, 8, 9, 10

## Domain Index

| Domain | Spec file | Issues covered |
|---|---|---|
| product-catalog | `specs/product-catalog/spec.md` | 1, 2, 5, 7 |
| inventory-management | `specs/inventory-management/spec.md` | 1, 8 |
| sales-processing | `specs/sales-processing/spec.md` | 2, 7, 8 |
| cross-cutting | `specs/cross-cutting/spec.md` | 2, 4, 6, 8, 9, 10 |

---

## product-catalog

> Issues: 1, 2, 5, 7

### MODIFIED Requirements

#### Requirement: Product Management

The system MUST support CRUD for products. Each product MUST belong to one category and MAY have one supplier. Products MUST have: Name, SKU (unique per tenant), Description, UnitPrice, Barcode (optional), IsActive flag. Soft-delete MUST be applied via EF Core interceptor. The product form component MUST render its template from an external `.html` file (`templateUrl`). All dropdown (`p-select`) controls inside the product form dialog MUST use `appendTo="body"` to prevent clipping. Currency amounts MUST display in COP.
(Previously: template was inline; no `appendTo` constraint; currency was USD)

##### Scenario: Create product

- GIVEN an authenticated Admin or Pharmacist
- WHEN they POST to `/api/v1/products` with valid product data
- THEN the product is created with the current TenantId
- AND a unique ProductId is generated

##### Scenario: SKU uniqueness within tenant

- GIVEN product with SKU "MED-001" exists in Tenant 1
- WHEN another product with SKU "MED-001" is created in Tenant 1
- THEN creation fails with validation error "SKU already exists"

##### Scenario: Soft delete product

- GIVEN an existing active product
- WHEN Admin sends DELETE `/api/v1/products/{id}`
- THEN the product's IsDeleted flag is set to true
- AND it no longer appears in default queries
- AND related inventory records remain intact

##### Scenario: Dropdown renders inside dialog

- GIVEN the product form is open inside a `<p-dialog>`
- WHEN a `<p-select>` dropdown (category, supplier) is opened
- THEN the dropdown panel renders outside the dialog stacking context
- AND the dropdown is fully visible without clipping

##### Scenario: Currency displays as COP

- GIVEN a product with UnitPrice 5000
- WHEN the product list or form renders the price
- THEN the UI displays "$5.000 COP" (or equivalent COP-formatted string)
- AND no "USD" label appears

#### Requirement: Product Search and Filtering

The system MUST support searching products by name, SKU, or barcode. Filtering MUST support: by category, by active/inactive status, by supplier. Results MUST be paginated. The default page size MUST be sourced from the `Pagination.DEFAULT_PAGE_SIZE` constant (20). The active/inactive filter values MUST use the `AppStatus` constants.
(Previously: default page size 20 was hardcoded inline; status strings were hardcoded literals)

##### Scenario: Search by name

- GIVEN 50 products in the catalog
- WHEN a user searches for "Ibuprofen"
- THEN matching products are returned sorted by relevance
- AND results are paginated

##### Scenario: Filter by category

- GIVEN products across 5 categories
- WHEN filtering by category "Analgesics"
- THEN only products in that category are returned

##### Scenario: Default pagination uses constant

- GIVEN no explicit page size is passed
- WHEN products are queried
- THEN `Pagination.DEFAULT_PAGE_SIZE` (20) is applied
- AND no literal `20` appears as a magic number in the component

---

## inventory-management

> Issues: 1, 8

### MODIFIED Requirements

#### Requirement: Product Ingress (Stock Entry)

The system MUST support recording stock entries from supplier deliveries. Each entry MUST reference: ProductId, Quantity, SupplierId (optional), BatchNumber (optional), EntryDate. A StockMovement record of type "Ingress" MUST be created. The ingress form component MUST render its template from an external `.html` file (`templateUrl`). All dropdown (`p-select`) controls inside the ingress form dialog MUST use `appendTo="body"` to prevent clipping.
(Previously: no `appendTo` constraint on ingress form dropdowns)

##### Scenario: Record stock entry

- GIVEN a product "Ibuprofen 400mg" with current stock 50
- WHEN a Pharmacist records an ingress of 100 units from supplier "LabX"
- THEN current stock becomes 150
- AND a StockMovement(Type: Ingress, Qty: 100) is recorded

##### Scenario: Ingress with batch number

- GIVEN a delivery with batch tracking
- WHEN recording ingress with BatchNumber "LOT-2026-001"
- THEN the batch number is stored on the movement record

##### Scenario: Dropdown renders inside ingress dialog

- GIVEN the ingress form is open inside a `<p-dialog>`
- WHEN a `<p-select>` dropdown (supplier) is opened
- THEN the dropdown panel renders outside the dialog stacking context
- AND the dropdown is fully visible without clipping

### RENAMED Requirements

#### Requirement: Paged Result Model Source → Core Paged Result Model

(Reason: `PagedResult<T>` was in `catalog/models/` — a shared model must live in `core/models/` to avoid cross-feature imports)
(Migration: update all imports from `catalog/models/paged-result.model` to `core/models/paged-result.model`; delete the original file)

---

## sales-processing

> Issues: 2, 7, 8

### MODIFIED Requirements

#### Requirement: Sale Creation

The system MUST support creating sales with one or more line items. Each SaleItem MUST reference a ProductId, Quantity, and UnitPrice (captured at time of sale). The Sale aggregate MUST calculate TotalAmount. Sale status: Completed, Voided. Only Admin and Clerk roles MAY create sales. Role checks MUST use the `AppRoles` constants. Sale status values MUST use the `AppStatus` constants. Currency amounts in the POS and sales history views MUST display in COP.
(Previously: role strings hardcoded as literals; status strings hardcoded; currency displayed as USD)

##### Scenario: Create a sale

- GIVEN products with prices in COP
- WHEN Clerk creates a sale with 2x Ibuprofen + 1x Bandages
- THEN Sale is created with TotalAmount in COP
- AND SaleItems are recorded with prices at time of sale

##### Scenario: Insufficient stock

- GIVEN product "Ibuprofen" with stock 2
- WHEN a sale requests 5 units of Ibuprofen
- THEN sale creation fails with "Insufficient stock for Ibuprofen"
- AND no stock is deducted

##### Scenario: Role check uses constants

- GIVEN a component that guards sale creation by role
- WHEN the role guard is evaluated
- THEN it reads `AppRoles.ADMIN` or `AppRoles.CLERK`
- AND no literal strings like `'Admin'` or `'Clerk'` appear in the component

#### Requirement: Sales Reporting

The system MUST provide sales reports: daily/weekly/monthly totals, top-selling products, revenue by date range. Reports MUST be tenant-scoped. Endpoint: `/api/v1/reports/sales`. The sales-history component MUST render its template from an external `.html` file (`templateUrl`). Pagination defaults MUST use `Pagination.DEFAULT_PAGE_SIZE`.
(Previously: template inline; pagination hardcoded; currency USD)

##### Scenario: Daily sales report

- GIVEN 15 sales completed today
- WHEN Admin queries `/api/v1/reports/sales?period=daily`
- THEN total revenue, transaction count, and top products are returned

##### Scenario: Sales history pagination uses constant

- GIVEN the sales-history component loads
- WHEN it initializes pagination
- THEN it reads `Pagination.DEFAULT_PAGE_SIZE` for the default rows-per-page value

---

## cross-cutting

> Issues: 2, 4, 6, 8, 9, 10

### ADDED Requirements

#### Requirement: Application Constants

The system MUST provide a single `AppConstants` module (`core/constants/app.constants.ts`) exporting `AppRoles`, `AppStatus`, and `Pagination` constant objects. All components and services referencing role names, status values, or pagination defaults MUST import from this module. Hardcoded literals for these values MUST NOT appear elsewhere.

##### Scenario: Role constant used in guard

- GIVEN a route or UI guard that checks for Admin access
- WHEN the guard is evaluated
- THEN it reads `AppRoles.ADMIN` from `app.constants.ts`
- AND the literal string `'Admin'` does not appear in the guard code

##### Scenario: Constants are the single source of truth

- GIVEN a developer searches the codebase for `'Pharmacist'`
- WHEN the search runs
- THEN zero occurrences appear outside `app.constants.ts`

#### Requirement: Global Shared CSS Utilities

The system MUST define `.form-body`, `.field`, and `.page-header` utility classes in `src/styles.scss`. Components MUST NOT redeclare these classes in component-scoped stylesheets.

##### Scenario: Form layout uses global class

- GIVEN a form component rendered in the browser
- WHEN DevTools inspect the `.form-body` element
- THEN the style resolves from `styles.scss` (global), not a component stylesheet

##### Scenario: No duplicate declarations

- GIVEN a developer searches component stylesheets for `.form-body`
- WHEN the search runs
- THEN zero component-scoped `.form-body` declarations are found

#### Requirement: PagedResult Core Model

The system MUST define `PagedResult<T>` in `core/models/paged-result.model.ts`. All bounded contexts MUST import from `core/models/`. No import from `catalog/models/` for this type is permitted.

##### Scenario: Shared model imported from core

- GIVEN any component or service using `PagedResult<T>`
- WHEN the import is resolved
- THEN it points to `core/models/paged-result.model`
- AND no import points to `catalog/models/paged-result.model`

#### Requirement: Dependency Vulnerability Mitigation

The system MUST NOT ship with known high/critical transitive vulnerabilities. The `glob` v7 vulnerability MUST be resolved via `package.json` `overrides`. `ng build` and `ng serve` MUST succeed after the override is applied.

##### Scenario: npm audit reports no glob v7 vulnerability

- GIVEN the `glob` override is applied in `package.json`
- WHEN `npm audit` is run
- THEN no `glob@7.x` vulnerability is reported

##### Scenario: Build succeeds with override

- GIVEN the `glob` override is in place
- WHEN `ng build` runs
- THEN the build completes without errors

#### Requirement: Swagger JWT Authorization

The backend Swagger UI MUST include a JWT Bearer `SecurityDefinition` and a global `SecurityRequirement`. The Swagger UI MUST display an "Authorize" button. Authenticated calls via Swagger MUST include the `Authorization: Bearer <token>` header.

##### Scenario: Authorize button visible

- GIVEN the backend is running and Swagger UI is opened
- WHEN the page loads
- THEN an "Authorize" button is visible in the Swagger UI

##### Scenario: Bearer token applied to requests

- GIVEN a user enters a valid JWT via the Authorize dialog
- WHEN they execute a secured endpoint
- THEN the request includes `Authorization: Bearer <token>`
- AND the endpoint responds with 200 (not 401)

### REMOVED Requirements

#### Requirement: Dead i18n Locale Files

(Reason: `messages.es.json` and `messages.en.json` in `src/locale/` are unwired artifacts — no Angular i18n compilation references them)
(Migration: delete both files; backend `.resx` files and the i18n requirement remain valid and unaffected)

### MODIFIED Requirements

#### Requirement: Internationalization (i18n)

Backend error messages and validation messages MUST use resource files (.resx) with `IStringLocalizer<T>`. Frontend MUST use Angular's built-in i18n or `@ngx-translate/core`. Supported locales in v1: `es` (Spanish, default), `en` (English). All PrimeNG component labels MUST be translatable. API responses MUST include error messages in the requested locale (via `Accept-Language` header). Frontend locale extraction files (`messages.es.json`, `messages.en.json`) MUST NOT exist in `src/locale/` until Angular i18n is fully wired and XLF extraction is configured.
(Previously: dead `messages.es.json` and `messages.en.json` files were present without being wired to Angular i18n compilation)

##### Scenario: Spanish error message

- GIVEN a user with `Accept-Language: es`
- WHEN they submit an invalid product (missing name)
- THEN error message is "El nombre del producto es obligatorio"

##### Scenario: English error message

- GIVEN a user with `Accept-Language: en`
- WHEN they submit an invalid product (missing name)
- THEN error message is "Product name is required"

##### Scenario: Frontend locale switch

- GIVEN the UI is displayed in Spanish
- WHEN the user switches locale to English
- THEN all labels, messages, and PrimeNG components re-render in English

##### Scenario: No dead locale files

- GIVEN the `src/locale/` directory is inspected
- WHEN a search for `messages.es.json` and `messages.en.json` runs
- THEN both files are absent from the repository
