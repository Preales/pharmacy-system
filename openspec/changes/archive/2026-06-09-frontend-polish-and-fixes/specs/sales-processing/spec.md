# Delta for Sales Processing

> Issues: 2, 7, 8

## MODIFIED Requirements

### Requirement: Sale Creation

The system MUST support creating sales with one or more line items. Each SaleItem MUST reference a ProductId, Quantity, and UnitPrice (captured at time of sale). The Sale aggregate MUST calculate TotalAmount. Sale status: Completed, Voided. Only Admin and Clerk roles MAY create sales. Role checks MUST use the `AppRoles` constants. Sale status values MUST use the `AppStatus` constants. Currency amounts in the POS and sales history views MUST display in COP.
(Previously: role strings hardcoded as literals; status strings hardcoded; currency displayed as USD)

#### Scenario: Create a sale

- GIVEN products "Ibuprofen" (stock: 50, price: $5.000 COP) and "Bandages" (stock: 30, price: $3.000 COP)
- WHEN Clerk creates a sale with 2x Ibuprofen + 1x Bandages
- THEN Sale is created with TotalAmount = $13.000 COP
- AND SaleItems are recorded with prices at time of sale

#### Scenario: Insufficient stock

- GIVEN product "Ibuprofen" with stock 2
- WHEN a sale requests 5 units of Ibuprofen
- THEN sale creation fails with "Insufficient stock for Ibuprofen"
- AND no stock is deducted

#### Scenario: Role check uses constants

- GIVEN a component that guards sale creation by role
- WHEN the role guard is evaluated
- THEN it compares against `AppRoles.ADMIN` or `AppRoles.CLERK`
- AND no literal strings like `'Admin'` or `'Clerk'` appear in the component

### Requirement: Sales Reporting

The system MUST provide sales reports: daily/weekly/monthly totals, top-selling products, revenue by date range. Reports MUST be tenant-scoped. Endpoint: `/api/v1/reports/sales`. The sales-history component MUST render its template from an external `.html` file (`templateUrl`). Pagination defaults in the sales-history view MUST use `Pagination.DEFAULT_PAGE_SIZE`.
(Previously: template inline; pagination hardcoded; currency USD)

#### Scenario: Daily sales report

- GIVEN 15 sales completed today
- WHEN Admin queries `/api/v1/reports/sales?period=daily`
- THEN total revenue, transaction count, and top products are returned

#### Scenario: Sales history pagination uses constant

- GIVEN the sales-history component loads
- WHEN it initializes pagination
- THEN it reads `Pagination.DEFAULT_PAGE_SIZE` for the default rows-per-page value
