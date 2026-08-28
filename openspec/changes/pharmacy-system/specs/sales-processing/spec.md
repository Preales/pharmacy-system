# Sales Processing Specification

## Purpose

Handles sale transactions: creating sales with line items, automatic stock deduction, and receipt generation. All sales MUST be tenant-scoped. Supports offline queuing with eventual sync.

## Requirements

### Requirement: Sale Creation

The system MUST support creating sales with one or more line items. Each SaleItem MUST reference a ProductId, Quantity, and UnitPrice (captured at time of sale). The Sale aggregate MUST calculate TotalAmount. Sale status: Completed, Voided. Only Admin and Clerk roles MAY create sales.

#### Scenario: Create a sale

- GIVEN products "Ibuprofen" (stock: 50, price: $5) and "Bandages" (stock: 30, price: $3)
- WHEN Clerk creates a sale with 2x Ibuprofen + 1x Bandages
- THEN Sale is created with TotalAmount = $13
- AND SaleItems are recorded with prices at time of sale

#### Scenario: Insufficient stock

- GIVEN product "Ibuprofen" with stock 2
- WHEN a sale requests 5 units of Ibuprofen
- THEN sale creation fails with "Insufficient stock for Ibuprofen"
- AND no stock is deducted

### Requirement: Automatic Stock Deduction

When a sale is completed, the system MUST deduct sold quantities from inventory. A StockMovement of type "Sale" MUST be created per line item. Stock deduction and sale creation MUST be atomic (same transaction).

#### Scenario: Stock deduction on sale

- GIVEN product with stock 50
- WHEN a sale of 3 units is completed
- THEN stock becomes 47
- AND a StockMovement(Type: Sale, Qty: -3, SaleId) is recorded

#### Scenario: Atomicity on failure

- GIVEN a sale with 2 line items, second product has insufficient stock
- WHEN sale creation is attempted
- THEN the entire sale is rolled back
- AND no stock is deducted for any line item

### Requirement: Sale Voiding

Admin MUST be able to void a completed sale. Voiding MUST restore stock (reverse StockMovements). Voided sales MUST remain in records with status "Voided". Only Admin role MAY void sales.

#### Scenario: Void a sale

- GIVEN a completed sale with 3x Ibuprofen
- WHEN Admin voids the sale
- THEN sale status becomes "Voided"
- AND stock is restored by 3 units
- AND a StockMovement(Type: Adjustment, Reason: "Sale voided") is created

### Requirement: Receipt Generation

The system MUST generate receipt data for completed sales. Receipt MUST include: sale date, line items (product name, qty, unit price, subtotal), total amount, tenant info, sale number. Receipt is returned as a JSON response; PDF generation is deferred.

#### Scenario: Generate receipt

- GIVEN a completed sale
- WHEN the receipt endpoint is called `/api/v1/sales/{id}/receipt`
- THEN receipt JSON is returned with all line items and totals

### Requirement: Sales Reporting

The system MUST provide sales reports: daily/weekly/monthly totals, top-selling products, revenue by date range. Reports MUST be tenant-scoped. Endpoint: `/api/v1/reports/sales`.

#### Scenario: Daily sales report

- GIVEN 15 sales completed today
- WHEN Admin queries `/api/v1/reports/sales?period=daily`
- THEN total revenue, transaction count, and top products are returned

### Requirement: Offline Sale Queuing

When the client detects no connectivity, sales MUST be queued in IndexedDB. Queued sales MUST sync automatically when connectivity is restored. Conflict resolution: server stock validation on sync — if insufficient stock, the sale is marked as "SyncFailed" with reason.

#### Scenario: Offline sale creation

- GIVEN the Angular app detects no network connectivity
- WHEN a Clerk creates a sale
- THEN the sale is stored in IndexedDB with status "PendingSync"
- AND the UI confirms the sale was queued

#### Scenario: Sync on reconnect

- GIVEN 3 queued sales in IndexedDB
- WHEN connectivity is restored
- THEN sales are submitted to the API sequentially (FIFO)
- AND successfully synced sales are marked "Synced"

#### Scenario: Sync conflict (insufficient stock)

- GIVEN a queued sale for 10x Ibuprofen but server stock is 5
- WHEN the sale syncs
- THEN it is marked "SyncFailed" with reason "Insufficient stock"
- AND the user is notified to resolve the conflict
