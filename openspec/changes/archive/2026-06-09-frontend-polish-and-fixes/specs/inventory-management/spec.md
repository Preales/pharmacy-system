# Delta for Inventory Management

> Issues: 1, 8

## MODIFIED Requirements

### Requirement: Product Ingress (Stock Entry)

The system MUST support recording stock entries from supplier deliveries. Each entry MUST reference: ProductId, Quantity, SupplierId (optional), BatchNumber (optional), EntryDate. A StockMovement record of type "Ingress" MUST be created. The ingress form component MUST render its template from an external `.html` file (`templateUrl`). All dropdown (`p-select`) controls inside the ingress form dialog MUST use `appendTo="body"` to prevent clipping.
(Previously: no `appendTo` constraint; template inline constraint not present)

#### Scenario: Record stock entry

- GIVEN a product "Ibuprofen 400mg" with current stock 50
- WHEN a Pharmacist records an ingress of 100 units from supplier "LabX"
- THEN current stock becomes 150
- AND a StockMovement(Type: Ingress, Qty: 100) is recorded

#### Scenario: Ingress with batch number

- GIVEN a delivery with batch tracking
- WHEN recording ingress with BatchNumber "LOT-2026-001"
- THEN the batch number is stored on the movement record

#### Scenario: Dropdown renders inside ingress dialog

- GIVEN the ingress form is open inside a `<p-dialog>`
- WHEN a `<p-select>` dropdown (supplier) is opened
- THEN the dropdown panel renders outside the dialog stacking context
- AND the dropdown is fully visible without clipping

## RENAMED Requirements

### Requirement: Paged Result Model Source → Core Paged Result Model

(Reason: `PagedResult<T>` was defined in `catalog/models/`; it is a shared model and MUST live in `core/models/` to be usable across all bounded contexts without cross-feature imports)
(Migration: all imports of `PagedResult<T>` from `catalog/models/paged-result.model` MUST be updated to `core/models/paged-result.model`; the original file MUST be deleted)
