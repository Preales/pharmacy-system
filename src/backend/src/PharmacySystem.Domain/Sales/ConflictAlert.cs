using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Sales;

/// <summary>
/// Tracks a stock conflict detected during offline sale synchronization.
/// Created when an offline sale causes a product's stock to go negative.
/// An admin must review and resolve these alerts.
/// </summary>
public class ConflictAlert : Entity
{
    private ConflictAlert() { } // EF constructor

    public ConflictAlert(
        Guid tenantId,
        Guid saleId,
        Guid productId,
        string productName,
        int expectedStock,
        int actualStock)
    {
        TenantId = tenantId;
        SaleId = saleId;
        ProductId = productId;
        ProductName = productName;
        ExpectedStock = expectedStock;
        ActualStock = actualStock;
        DetectedAt = DateTime.UtcNow;
        IsResolved = false;
    }

    public Guid SaleId { get; private set; }

    public Guid ProductId { get; private set; }

    /// <summary>Snapshot of product name at detection time.</summary>
    public string ProductName { get; private set; } = string.Empty;

    /// <summary>Stock level expected before sale deduction (was considered available offline).</summary>
    public int ExpectedStock { get; private set; }

    /// <summary>Actual stock after deduction (may be negative).</summary>
    public int ActualStock { get; private set; }

    public DateTime DetectedAt { get; private set; }

    public DateTime? ResolvedAt { get; private set; }

    /// <summary>UserId of the admin who resolved this alert.</summary>
    public string? ResolvedBy { get; private set; }

    public bool IsResolved { get; private set; }

    /// <summary>
    /// Marks this conflict alert as resolved by an admin user.
    /// </summary>
    public void Resolve(string resolvedBy)
    {
        if (IsResolved)
            throw new InvalidOperationException("This conflict alert has already been resolved.");

        IsResolved = true;
        ResolvedAt = DateTime.UtcNow;
        ResolvedBy = resolvedBy;
    }
}
