using PharmacySystem.Application.Sales.DTOs;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Application.Sales.Mappings;

/// <summary>
/// Manual DTO mapping extension methods for the Sales bounded context.
/// No AutoMapper or Mapster — explicit property mapping only.
/// </summary>
public static class SalesMappings
{
    public static SaleLineDto ToDto(this SaleLine line) => new(
        Id: line.Id,
        ProductId: line.ProductId,
        ProductName: line.ProductName,
        Quantity: line.Quantity,
        UnitPrice: line.UnitPrice,
        Subtotal: line.Subtotal);

    public static SaleDto ToDto(this Sale sale) => new(
        Id: sale.Id,
        SaleNumber: sale.SaleNumber,
        SaleDate: sale.SaleDate,
        CustomerId: sale.CustomerId,
        Status: sale.Status.ToString(),
        TotalAmount: sale.TotalAmount,
        IsOfflineSync: sale.IsOfflineSync,
        VoidReason: sale.VoidReason,
        Lines: sale.SaleLines.Select(l => l.ToDto()).ToList().AsReadOnly());

    public static ConflictAlertDto ToDto(this ConflictAlert alert, string saleNumber) => new(
        Id: alert.Id,
        SaleId: alert.SaleId,
        SaleNumber: saleNumber,
        ProductId: alert.ProductId,
        ProductName: alert.ProductName,
        ExpectedStock: alert.ExpectedStock,
        ActualStock: alert.ActualStock,
        DetectedAt: alert.DetectedAt,
        ResolvedAt: alert.ResolvedAt,
        ResolvedBy: alert.ResolvedBy,
        IsResolved: alert.IsResolved);
}
