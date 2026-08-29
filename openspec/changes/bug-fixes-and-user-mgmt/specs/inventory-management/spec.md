# Delta for inventory-management

## ADDED Requirements

### Requirement: Paginated Full Inventory List

The system MUST expose `GET /api/v1/inventory` returning a paginated list of all `InventoryItem` records for the current tenant. Each item MUST include: product name, current stock quantity, and last movement date. Zero-stock products MUST be included. Search MUST cover product name and SKU.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | int | No | Default: 1 |
| `pageSize` | int | No | Default: 20 |
| `search` | string | No | Filters by product name or SKU |

#### Scenario: List all inventory items

- GIVEN 45 inventory items in the tenant
- WHEN GET `/api/v1/inventory?page=1&pageSize=20` is called
- THEN 20 items are returned with total count 45
- AND each item includes `productName`, `currentStock`, `lastMovementDate`

#### Scenario: Zero-stock products included

- GIVEN a product with no movements (stock = 0)
- WHEN GET `/api/v1/inventory` is called
- THEN the product appears in results with `currentStock: 0`

#### Scenario: Search by product name

- GIVEN products "Ibuprofen 400mg" and "Amoxicillin 500mg"
- WHEN GET `/api/v1/inventory?search=ibu` is called
- THEN only "Ibuprofen 400mg" is returned
