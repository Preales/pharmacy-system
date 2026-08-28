using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Sales;

/// <summary>
/// A single line item within a sale. Configured as an EF-owned entity (OwnsMany).
/// Prices and product name are snapshots captured at sale time.
/// </summary>
public class SaleLine : Entity
{
    private SaleLine() { } // EF constructor

    public SaleLine(
        Guid tenantId,
        Guid saleId,
        Guid productId,
        string productName,
        int quantity,
        decimal unitPrice)
    {
        TenantId = tenantId;
        SaleId = saleId;
        ProductId = productId;
        ProductName = productName;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    public Guid SaleId { get; private set; }

    public Guid ProductId { get; private set; }

    /// <summary>Snapshot of the product name at time of sale — decoupled from Catalog.</summary>
    public string ProductName { get; private set; } = string.Empty;

    public int Quantity { get; private set; }

    /// <summary>Snapshot of the unit price at time of sale.</summary>
    public decimal UnitPrice { get; private set; }

    /// <summary>Computed: Quantity × UnitPrice.</summary>
    public decimal Subtotal => Quantity * UnitPrice;
}
