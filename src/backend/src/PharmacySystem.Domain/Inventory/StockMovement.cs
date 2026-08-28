using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Inventory;

/// <summary>
/// Represents a single stock movement. Immutable after creation — no updates or deletes allowed.
/// </summary>
public enum MovementType
{
    Ingress = 0,
    Sale = 1,
    Adjustment = 2
}

public class StockMovement : Entity
{
    private StockMovement() { } // EF constructor

    public StockMovement(
        Guid tenantId,
        Guid productId,
        MovementType movementType,
        int quantity,
        string userId,
        string? reason = null,
        string? batchNumber = null,
        Guid? supplierId = null)
    {
        TenantId = tenantId;
        ProductId = productId;
        MovementType = movementType;
        Quantity = quantity;
        UserId = userId;
        Reason = reason;
        BatchNumber = batchNumber;
        SupplierId = supplierId;
        Timestamp = DateTime.UtcNow;
    }

    public Guid ProductId { get; private set; }

    /// <summary>
    /// Movement direction and type: Ingress (positive), Sale (negative), Adjustment (signed).
    /// </summary>
    public MovementType MovementType { get; private set; }

    /// <summary>
    /// Signed quantity delta applied to stock. Negative values reduce stock.
    /// </summary>
    public int Quantity { get; private set; }

    /// <summary>User who created this movement (sub from JWT).</summary>
    public string UserId { get; private set; } = string.Empty;

    /// <summary>Required for Adjustment movements; optional for others.</summary>
    public string? Reason { get; private set; }

    /// <summary>Optional batch/lot number for traceability (Ingress movements).</summary>
    public string? BatchNumber { get; private set; }

    /// <summary>Optional supplier reference for ingress movements.</summary>
    public Guid? SupplierId { get; private set; }

    public DateTime Timestamp { get; private set; }
}
