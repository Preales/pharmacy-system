using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Sales.DTOs;
using PharmacySystem.Application.Sales.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Application.Sales.Queries;

// ─── Get Sales (paginated list) ──────────────────────────────────────────────

public record GetSalesQuery(
    int Page,
    int PageSize,
    DateTime? DateFrom,
    DateTime? DateTo,
    string? Status,
    string? CustomerId) : IRequest<Result<PagedResult<SaleDto>>>;

public class GetSalesQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetSalesQuery, Result<PagedResult<SaleDto>>>
{
    public async Task<Result<PagedResult<SaleDto>>> Handle(
        GetSalesQuery request,
        CancellationToken cancellationToken)
    {
        var query = db.Set<Sale>()
            .Include(s => s.SaleLines)
            .AsNoTracking()
            .AsQueryable();

        if (request.DateFrom.HasValue)
            query = query.Where(s => s.SaleDate >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(s => s.SaleDate <= request.DateTo.Value);

        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<SaleStatus>(request.Status, ignoreCase: true, out var parsedStatus))
        {
            query = query.Where(s => s.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(request.CustomerId))
            query = query.Where(s => s.CustomerId == request.CustomerId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(s => s.SaleDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var pagedResult = new PagedResult<SaleDto>(
            Items: items.Select(s => s.ToDto()).ToList(),
            TotalCount: totalCount,
            Page: request.Page,
            PageSize: request.PageSize);

        return Result<PagedResult<SaleDto>>.Success(pagedResult);
    }
}

// ─── Get Sale By Id ──────────────────────────────────────────────────────────

public record GetSaleByIdQuery(Guid SaleId) : IRequest<Result<SaleDto>>;

public class GetSaleByIdQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetSaleByIdQuery, Result<SaleDto>>
{
    public async Task<Result<SaleDto>> Handle(
        GetSaleByIdQuery request,
        CancellationToken cancellationToken)
    {
        var sale = await db.Set<Sale>()
            .Include(s => s.SaleLines)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.SaleId, cancellationToken);

        if (sale is null)
            return Result<SaleDto>.Failure(
                new NotFoundError("SALE_NOT_FOUND", $"Sale {request.SaleId} not found."));

        return Result<SaleDto>.Success(sale.ToDto());
    }
}

// ─── Get Sales Summary ───────────────────────────────────────────────────────

public record GetSalesSummaryQuery(
    DateTime DateFrom,
    DateTime DateTo) : IRequest<Result<SaleSummaryDto>>;

public class GetSalesSummaryQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetSalesSummaryQuery, Result<SaleSummaryDto>>
{
    public async Task<Result<SaleSummaryDto>> Handle(
        GetSalesSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var completedSales = await db.Set<Sale>()
            .AsNoTracking()
            .Where(s =>
                s.Status == SaleStatus.Completed &&
                s.SaleDate >= request.DateFrom &&
                s.SaleDate <= request.DateTo)
            .ToListAsync(cancellationToken);

        var totalSales = completedSales.Count;
        var totalRevenue = completedSales.Sum(s => s.TotalAmount);
        var averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0m;

        return Result<SaleSummaryDto>.Success(new SaleSummaryDto(
            TotalSales: totalSales,
            TotalRevenue: totalRevenue,
            AverageTicket: averageTicket,
            PeriodStart: request.DateFrom,
            PeriodEnd: request.DateTo));
    }
}
