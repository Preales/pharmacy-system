namespace PharmacySystem.Application.Sales.DTOs;

public record SaleLineDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal);

public record SaleDto(
    Guid Id,
    string SaleNumber,
    DateTime SaleDate,
    string? CustomerId,
    string Status,
    decimal TotalAmount,
    bool IsOfflineSync,
    string? VoidReason,
    IReadOnlyCollection<SaleLineDto> Lines);

public record SaleSummaryDto(
    int TotalSales,
    decimal TotalRevenue,
    decimal AverageTicket,
    DateTime PeriodStart,
    DateTime PeriodEnd);

public record ConflictAlertDto(
    Guid Id,
    Guid SaleId,
    string SaleNumber,
    Guid ProductId,
    string ProductName,
    int ExpectedStock,
    int ActualStock,
    DateTime DetectedAt,
    DateTime? ResolvedAt,
    string? ResolvedBy,
    bool IsResolved);
