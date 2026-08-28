using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Sales;

/// <summary>
/// Raised when a sale is successfully completed and stock has been deducted.
/// </summary>
public record SaleCompletedEvent(
    Guid SaleId,
    Guid TenantId,
    string SaleNumber,
    decimal TotalAmount) : DomainEvent;

/// <summary>
/// Raised when a completed sale is voided and stock has been restored.
/// </summary>
public record SaleVoidedEvent(
    Guid SaleId,
    Guid TenantId,
    string SaleNumber,
    string VoidReason) : DomainEvent;

/// <summary>
/// Raised when an offline sync sale results in negative stock for a product.
/// </summary>
public record StockConflictDetectedEvent(
    Guid AlertId,
    Guid TenantId,
    Guid SaleId,
    Guid ProductId,
    string ProductName,
    int ExpectedStock,
    int ActualStock) : DomainEvent;
