using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Inventory;

/// <summary>
/// Tracks the current stock level for a product within a tenant.
/// Stock is modified exclusively via StockMovement records.
/// </summary>
public class InventoryItem : AggregateRoot
{
    private InventoryItem() { } // EF constructor

    public InventoryItem(Guid tenantId, Guid productId, int lowStockThreshold = 10)
    {
        TenantId = tenantId;
        ProductId = productId;
        CurrentStock = 0;
        LowStockThreshold = lowStockThreshold;
    }

    public Guid ProductId { get; private set; }

    /// <summary>Current on-hand quantity. Always reflects the sum of all movements.</summary>
    public int CurrentStock { get; private set; }

    /// <summary>Alert threshold. Default: 10 units.</summary>
    public int LowStockThreshold { get; private set; }

    public bool IsLowStock => CurrentStock <= LowStockThreshold;

    /// <summary>
    /// Applies a stock delta from a movement (positive = increase, negative = decrease).
    /// </summary>
    public void ApplyMovement(int delta)
    {
        CurrentStock += delta;
    }

    public void UpdateThreshold(int threshold)
    {
        if (threshold < 0)
            throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold cannot be negative.");
        LowStockThreshold = threshold;
    }
}
