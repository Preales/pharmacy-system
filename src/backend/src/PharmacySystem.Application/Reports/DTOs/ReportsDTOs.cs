namespace PharmacySystem.Application.Reports.DTOs;

public record DailySalesDto(
    DateTime Date,
    int SaleCount,
    decimal Revenue);

public record TopProductDto(
    Guid ProductId,
    string ProductName,
    int TotalQuantity,
    decimal TotalRevenue);

public record DashboardReportDto(
    int TotalSalesToday,
    decimal TotalRevenueToday,
    int TotalSalesThisMonth,
    decimal TotalRevenueThisMonth,
    decimal AverageTicket,
    IReadOnlyList<TopProductDto> TopProductsThisMonth,
    int LowStockProductsCount,
    int PendingConflictAlertsCount);

public record SalesReportDto(
    DateTime PeriodStart,
    DateTime PeriodEnd,
    int TotalSales,
    decimal TotalRevenue,
    decimal AverageTicket,
    IReadOnlyList<DailySalesDto> DailySales,
    IReadOnlyList<TopProductDto> TopProducts);

public record InventoryReportDto(
    int TotalProducts,
    int LowStockProducts,
    int ZeroStockProducts,
    decimal TotalStockValue,
    IReadOnlyList<LowStockProductDto> LowStockItems);

public record LowStockProductDto(
    Guid ProductId,
    string ProductName,
    string Sku,
    int CurrentStock,
    int LowStockThreshold,
    decimal CostPrice);
