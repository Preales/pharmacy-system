# Product Catalog Specification

## Purpose

Manages the pharmacy's product catalog including products, categories, and suppliers. All data MUST be tenant-scoped. Supports full CRUD operations with role-based access.

## Requirements

### Requirement: Product Management

The system MUST support CRUD for products. Each product MUST belong to one category and MAY have one supplier. Products MUST have: Name, SKU (unique per tenant), Description, UnitPrice, Barcode (optional), IsActive flag. Soft-delete MUST be applied via EF Core interceptor.

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

### Requirement: Category Management

The system MUST support CRUD for product categories. Categories MUST be tenant-scoped. Categories MAY be hierarchical (ParentCategoryId). A category with associated products MUST NOT be hard-deleted.

#### Scenario: Create category

- GIVEN an Admin user
- WHEN they POST `/api/v1/categories` with name "Analgesics"
- THEN the category is created under the current tenant

#### Scenario: Delete category with products

- GIVEN a category with 3 associated products
- WHEN Admin attempts to delete the category
- THEN deletion is rejected with error "Category has associated products"

### Requirement: Supplier Management

The system MUST support CRUD for suppliers. Suppliers MUST have: Name, ContactEmail, Phone, Address (optional). Suppliers are tenant-scoped.

#### Scenario: Create supplier

- GIVEN an Admin user
- WHEN they POST `/api/v1/suppliers` with valid data
- THEN the supplier is created under the current tenant

### Requirement: Product Search and Filtering

The system MUST support searching products by name, SKU, or barcode. Filtering MUST support: by category, by active/inactive status, by supplier. Results MUST be paginated (default page size: 20).

#### Scenario: Search by name

- GIVEN 50 products in the catalog
- WHEN a user searches for "Ibuprofen"
- THEN matching products are returned sorted by relevance
- AND results are paginated

#### Scenario: Filter by category

- GIVEN products across 5 categories
- WHEN filtering by category "Analgesics"
- THEN only products in that category are returned

### Requirement: Manual DTO Mapping

Product DTOs MUST be mapped using extension methods (e.g., `ProductDto.ToEntity()`, `Product.ToDto()`). AutoMapper and Mapster MUST NOT be used. Extension methods MUST live on the DTO classes in the Application layer.

#### Scenario: DTO to entity mapping

- GIVEN a `CreateProductCommand` with product data
- WHEN the handler processes it
- THEN it uses `command.ToEntity()` extension method to create the domain entity
- AND no reflection-based mapper is invoked
