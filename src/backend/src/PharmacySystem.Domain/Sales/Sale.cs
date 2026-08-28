using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Sales;

/// <summary>
/// Lifecycle status of a sale transaction.
/// </summary>
public enum SaleStatus
{
    Draft = 0,
    Completed = 1,
    Voided = 2
}

/// <summary>
/// Sale aggregate — represents a single POS transaction within a tenant.
/// Owns SaleLines as an EF-owned collection.
/// </summary>
public class Sale : AggregateRoot
{
    private readonly List<SaleLine> _saleLines = [];

    private Sale() { } // EF constructor

    public Sale(Guid tenantId, string saleNumber, string? customerId = null)
    {
        TenantId = tenantId;
        SaleNumber = saleNumber;
        SaleDate = DateTime.UtcNow;
        Status = SaleStatus.Draft;
        CustomerId = customerId;
        IsOfflineSync = false;
    }

    /// <summary>Auto-generated number in format SALE-{YYYYMMDD}-{sequence}.</summary>
    public string SaleNumber { get; private set; } = string.Empty;

    public DateTime SaleDate { get; private set; }

    /// <summary>Optional customer identifier — free-form string, no Customer entity in v1.</summary>
    public string? CustomerId { get; private set; }

    public SaleStatus Status { get; private set; }

    /// <summary>True when this sale was submitted via offline sync queue.</summary>
    public bool IsOfflineSync { get; private set; }

    /// <summary>Populated when status is Voided.</summary>
    public string? VoidReason { get; private set; }

    /// <summary>Computed from line subtotals. Updated on every AddLine call.</summary>
    public decimal TotalAmount { get; private set; }

    public IReadOnlyCollection<SaleLine> SaleLines => _saleLines.AsReadOnly();

    // ─── Domain Methods ──────────────────────────────────────────────────────

    /// <summary>
    /// Adds a line item to this sale. Recalculates TotalAmount.
    /// Only allowed while sale is in Draft status.
    /// </summary>
    public void AddLine(Guid productId, string productName, int quantity, decimal unitPrice)
    {
        if (Status != SaleStatus.Draft)
            throw new InvalidOperationException("Cannot add lines to a sale that is not in Draft status.");

        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be greater than zero.");

        if (unitPrice < 0)
            throw new ArgumentOutOfRangeException(nameof(unitPrice), "Unit price cannot be negative.");

        var line = new SaleLine(TenantId, Id, productId, productName, quantity, unitPrice);
        _saleLines.Add(line);
        RecalculateTotal();
    }

    /// <summary>
    /// Transitions the sale from Draft to Completed. Raises SaleCompletedEvent.
    /// </summary>
    public void Complete()
    {
        if (Status != SaleStatus.Draft)
            throw new InvalidOperationException("Only Draft sales can be completed.");

        if (_saleLines.Count == 0)
            throw new InvalidOperationException("Cannot complete a sale with no line items.");

        Status = SaleStatus.Completed;
        AddDomainEvent(new SaleCompletedEvent(Id, TenantId, SaleNumber, TotalAmount));
    }

    /// <summary>
    /// Voids a completed sale. Raises SaleVoidedEvent.
    /// </summary>
    public void Void(string reason)
    {
        if (Status != SaleStatus.Completed)
            throw new InvalidOperationException("Only Completed sales can be voided.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A void reason is required.", nameof(reason));

        Status = SaleStatus.Voided;
        VoidReason = reason;
        AddDomainEvent(new SaleVoidedEvent(Id, TenantId, SaleNumber, reason));
    }

    /// <summary>
    /// Marks this sale as originating from an offline sync submission.
    /// </summary>
    public void MarkAsOfflineSync()
    {
        IsOfflineSync = true;
    }

    private void RecalculateTotal()
    {
        TotalAmount = _saleLines.Sum(l => l.Subtotal);
    }
}
