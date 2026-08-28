using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Reports.DTOs;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Application.Reports.Queries;

// ─── Dashboard Report ─────────────────────────────────────────────────────────

public record GetDashboardReportQuery : IRequest<Result<DashboardReportDto>>;

public class GetDashboardReportQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetDashboardReportQuery, Result<DashboardReportDto>>
{
    public async Task<Result<DashboardReportDto>> Handle(
        GetDashboardReportQuery request,
        CancellationToken cancellationToken)
    {
        var todayUtc = DateTime.UtcNow.Date;
        var tomorrowUtc = todayUtc.AddDays(1);
        var monthStartUtc = new DateTime(todayUtc.Year, todayUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Sales today
        var salesToday = await db.Set<Sale>()
            .Where(s => s.Status == SaleStatus.Completed
                     && s.SaleDate >= todayUtc
                     && s.SaleDate < tomorrowUtc)
            .ToListAsync(cancellationToken);

        // Sales this month
        var salesThisMonth = await db.Set<Sale>()
            .Where(s => s.Status == SaleStatus.Completed
                     && s.SaleDate >= monthStartUtc
                     && s.SaleDate < tomorrowUtc)
            .ToListAsync(cancellationToken);

        var totalSalesToday = salesToday.Count;
        var totalRevenueToday = salesToday.Sum(s => s.TotalAmount);
        var totalSalesThisMonth = salesThisMonth.Count;
        var totalRevenueThisMonth = salesThisMonth.Sum(s => s.TotalAmount);
        var averageTicket = totalSalesThisMonth > 0
            ? totalRevenueThisMonth / totalSalesThisMonth
            : 0m;

        // Top 5 products by quantity this month — from SaleLines via owned collection
        var saleIdsThisMonth = salesThisMonth.Select(s => s.Id).ToHashSet();

        var topProducts = salesThisMonth
            .SelectMany(s => s.SaleLines)
            .GroupBy(l => new { l.ProductId, l.ProductName })
            .Select(g => new TopProductDto(
                g.Key.ProductId,
                g.Key.ProductName,
                g.Sum(l => l.Quantity),
                g.Sum(l => l.Subtotal)))
            .OrderByDescending(p => p.TotalQuantity)
            .Take(5)
            .ToList();

        // Low stock count
        var lowStockCount = await db.Set<PharmacySystem.Domain.Inventory.InventoryItem>()
            .CountAsync(i => i.CurrentStock <= i.LowStockThreshold, cancellationToken);

        // Pending conflict alerts count
        var pendingAlertsCount = await db.Set<PharmacySystem.Domain.Sales.ConflictAlert>()
            .CountAsync(a => !a.IsResolved, cancellationToken);

        var dto = new DashboardReportDto(
            totalSalesToday,
            totalRevenueToday,
            totalSalesThisMonth,
            totalRevenueThisMonth,
            averageTicket,
            topProducts,
            lowStockCount,
            pendingAlertsCount);

        return Result<DashboardReportDto>.Success(dto);
    }
}

// ─── Sales Report ─────────────────────────────────────────────────────────────

public record GetSalesReportQuery(DateTime DateFrom, DateTime DateTo)
    : IRequest<Result<SalesReportDto>>;

public class GetSalesReportQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetSalesReportQuery, Result<SalesReportDto>>
{
    public async Task<Result<SalesReportDto>> Handle(
        GetSalesReportQuery request,
        CancellationToken cancellationToken)
    {
        var dateTo = request.DateTo.Date.AddDays(1); // inclusive end

        var sales = await db.Set<Sale>()
            .Where(s => s.Status == SaleStatus.Completed
                     && s.SaleDate >= request.DateFrom.Date
                     && s.SaleDate < dateTo)
            .ToListAsync(cancellationToken);

        var dailySales = sales
            .GroupBy(s => s.SaleDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new DailySalesDto(
                g.Key,
                g.Count(),
                g.Sum(s => s.TotalAmount)))
            .ToList();

        var topProducts = sales
            .SelectMany(s => s.SaleLines)
            .GroupBy(l => new { l.ProductId, l.ProductName })
            .Select(g => new TopProductDto(
                g.Key.ProductId,
                g.Key.ProductName,
                g.Sum(l => l.Quantity),
                g.Sum(l => l.Subtotal)))
            .OrderByDescending(p => p.TotalQuantity)
            .Take(10)
            .ToList();

        var totalSales = sales.Count;
        var totalRevenue = sales.Sum(s => s.TotalAmount);
        var averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0m;

        var dto = new SalesReportDto(
            request.DateFrom.Date,
            request.DateTo.Date,
            totalSales,
            totalRevenue,
            averageTicket,
            dailySales,
            topProducts);

        return Result<SalesReportDto>.Success(dto);
    }
}

// ─── Inventory Report ────────────────────────────────────────────────────────

public record GetInventoryReportQuery : IRequest<Result<InventoryReportDto>>;

public class GetInventoryReportQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetInventoryReportQuery, Result<InventoryReportDto>>
{
    public async Task<Result<InventoryReportDto>> Handle(
        GetInventoryReportQuery request,
        CancellationToken cancellationToken)
    {
        // Join InventoryItem with Product to get cost price and names
        var inventoryData = await (
            from inv in db.Set<PharmacySystem.Domain.Inventory.InventoryItem>()
            join prod in db.Set<PharmacySystem.Domain.Catalog.Product>()
                on inv.ProductId equals prod.Id
            where prod.IsActive
            select new
            {
                inv.ProductId,
                prod.Name,
                prod.Sku,
                inv.CurrentStock,
                inv.LowStockThreshold,
                prod.CostPrice
            })
            .ToListAsync(cancellationToken);

        var totalProducts = inventoryData.Count;
        var lowStockItems = inventoryData
            .Where(i => i.CurrentStock > 0 && i.CurrentStock <= i.LowStockThreshold)
            .ToList();
        var zeroStockItems = inventoryData.Where(i => i.CurrentStock <= 0).ToList();
        var totalStockValue = inventoryData.Sum(i => i.CurrentStock * i.CostPrice);

        var lowStockDtos = inventoryData
            .Where(i => i.CurrentStock <= i.LowStockThreshold)
            .OrderBy(i => i.CurrentStock)
            .Select(i => new LowStockProductDto(
                i.ProductId,
                i.Name,
                i.Sku,
                i.CurrentStock,
                i.LowStockThreshold,
                i.CostPrice))
            .ToList();

        var dto = new InventoryReportDto(
            totalProducts,
            lowStockItems.Count,
            zeroStockItems.Count,
            totalStockValue,
            lowStockDtos);

        return Result<InventoryReportDto>.Success(dto);
    }
}
