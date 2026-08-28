# Delta for Product Catalog

> Issues: 1, 2, 5, 7

## MODIFIED Requirements

### Requirement: Product Management

The system MUST support CRUD for products. Each product MUST belong to one category and MAY have one supplier. Products MUST have: Name, SKU (unique per tenant), Description, UnitPrice, Barcode (optional), IsActive flag. Soft-delete MUST be applied via EF Core interceptor. The product form component MUST render its template from an external `.html` file (`templateUrl`). All dropdown (`p-select`) controls inside the product form dialog MUST use `appendTo="body"` to prevent clipping. Currency amounts MUST display in COP.
(Previously: template was inline; no `appendTo` constraint; currency was USD)

#### Scenario: Create product

- GIVEN an authenticated Admin or Pharmacist
- WHEN they POST to `/api/v1/products` with valid product data
- THEN the product is created with the current TenantId
- AND a unique ProductId is generated

#### Scenario: SKU uniqueness within tenant

- GIVEN product with SKU "MED-001" exists in Tenant 1
- WHEN another product with SKU "MED-001" is created in Tenant 1
- THEN creation fails with validation error "SKU already exists"

#### Scenario: Soft delete product

- GIVEN an existing active product
- WHEN Admin sends DELETE `/api/v1/products/{id}`
- THEN the product's IsDeleted flag is set to true
- AND it no longer appears in default queries
- AND related inventory records remain intact

#### Scenario: Dropdown renders inside dialog

- GIVEN the product form is open inside a `<p-dialog>`
- WHEN a `<p-select>` dropdown (category, supplier) is opened
- THEN the dropdown panel renders outside the dialog stacking context
- AND the dropdown is fully visible without clipping

#### Scenario: Currency displays as COP

- GIVEN a product with UnitPrice 5000
- WHEN the product list or form renders the price
- THEN the UI displays "$5.000 COP" (or equivalent COP-formatted string)
- AND no "USD" label appears

### Requirement: Product Search and Filtering

The system MUST support searching products by name, SKU, or barcode. Filtering MUST support: by category, by active/inactive status, by supplier. Results MUST be paginated. The default page size MUST be sourced from the `Pagination.DEFAULT_PAGE_SIZE` constant (20). The active/inactive filter values MUST use the `AppStatus` constants.
(Previously: default page size 20 was hardcoded inline; status strings were hardcoded literals)

#### Scenario: Search by name

- GIVEN 50 products in the catalog
- WHEN a user searches for "Ibuprofen"
- THEN matching products are returned sorted by relevance
- AND results are paginated

#### Scenario: Filter by category

- GIVEN products across 5 categories
- WHEN filtering by category "Analgesics"
- THEN only products in that category are returned

#### Scenario: Default pagination uses constant

- GIVEN no explicit page size is passed
- WHEN products are queried
- THEN `Pagination.DEFAULT_PAGE_SIZE` (20) is applied
- AND no literal `20` appears as a magic number in the component

### Requirement: Manual DTO Mapping

Product DTOs MUST be mapped using extension methods (e.g., `ProductDto.ToEntity()`, `Product.ToDto()`). AutoMapper and Mapster MUST NOT be used. Extension methods MUST live on the DTO classes in the Application layer.

#### Scenario: DTO to entity mapping

- GIVEN a `CreateProductCommand` with product data
- WHEN the handler processes it
- THEN it uses `command.ToEntity()` extension method to create the domain entity
- AND no reflection-based mapper is invoked
