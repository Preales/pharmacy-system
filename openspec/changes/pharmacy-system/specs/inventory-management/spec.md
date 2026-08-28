# Inventory Management Specification

## Purpose

Tracks stock levels, records product ingress (supplier deliveries), and handles manual adjustments. All inventory data MUST be tenant-scoped. Stock changes MUST be auditable via movement records.

## Requirements

### Requirement: Stock Level Tracking

The system MUST maintain current stock quantity for each product per tenant. Stock levels MUST be derived from movement records (ingress, sale deductions, adjustments). The system MUST provide a low-stock query with configurable threshold per product (default: 10 units).

#### Scenario: View current stock

- GIVEN a product with recorded movements totaling 150 units
- WHEN a user queries `/api/v1/inventory/{productId}`
- THEN current stock quantity 150 is returned
- AND low-stock status is calculated against the product's threshold

#### Scenario: Low stock query

- GIVEN products with stock below their thresholds
- WHEN a user queries `/api/v1/inventory/low-stock`
- THEN only products below their configured threshold are returned
- AND results include product name, current stock, and threshold

### Requirement: Product Ingress (Stock Entry)

The system MUST support recording stock entries from supplier deliveries. Each entry MUST reference: ProductId, Quantity, SupplierId (optional), BatchNumber (optional), EntryDate. A StockMovement record of type "Ingress" MUST be created.

#### Scenario: Record stock entry

- GIVEN a product "Ibuprofen 400mg" with current stock 50
- WHEN a Pharmacist records an ingress of 100 units from supplier "LabX"
- THEN current stock becomes 150
- AND a StockMovement(Type: Ingress, Qty: 100) is recorded

#### Scenario: Ingress with batch number

- GIVEN a delivery with batch tracking
- WHEN recording ingress with BatchNumber "LOT-2026-001"
- THEN the batch number is stored on the movement record

### Requirement: Stock Adjustments

The system MUST support manual stock adjustments (damage, expiry, count corrections). Adjustments MUST include a reason. A StockMovement of type "Adjustment" MUST be created. Only Admin and Pharmacist roles MAY create adjustments.

#### Scenario: Adjustment for damaged goods

- GIVEN product with current stock 100
- WHEN Pharmacist creates adjustment of -5 with reason "Damaged in transit"
- THEN current stock becomes 95
- AND a StockMovement(Type: Adjustment, Qty: -5, Reason: "Damaged in transit") is recorded

#### Scenario: Clerk attempts adjustment

- GIVEN a user with role Clerk
- WHEN they attempt to create a stock adjustment
- THEN HTTP 403 is returned

### Requirement: Stock Movement Audit Trail

The system MUST record all stock changes as immutable StockMovement records. Movements MUST NOT be editable or deletable. Each movement MUST record: MovementType (Ingress/Sale/Adjustment), Quantity, Timestamp, UserId, ProductId, Reason (for adjustments).

#### Scenario: Query movement history

- GIVEN a product with 10 movements over the past month
- WHEN a user queries `/api/v1/inventory/{productId}/movements`
- THEN all movements are returned chronologically
- AND each includes type, quantity, user, and timestamp

### Requirement: Inventory Dashboard Reporting

The system MUST provide inventory summary reports: total products, total stock value (qty * unit price), low-stock count, movements by type in a date range. Reports MUST be tenant-scoped.

#### Scenario: Inventory summary report

- GIVEN 200 products with various stock levels
- WHEN Admin requests `/api/v1/reports/inventory-summary`
- THEN total products, total stock value, and low-stock count are returned
