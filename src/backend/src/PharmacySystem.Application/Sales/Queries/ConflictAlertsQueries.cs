using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Sales.DTOs;
using PharmacySystem.Application.Sales.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Application.Sales.Queries;

// ─── Get Conflict Alerts (paginated list) ────────────────────────────────────

public record GetConflictAlertsQuery(
    int Page,
    int PageSize,
    bool? IsResolved) : IRequest<Result<PagedResult<ConflictAlertDto>>>;

public class GetConflictAlertsQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetConflictAlertsQuery, Result<PagedResult<ConflictAlertDto>>>
{
    public async Task<Result<PagedResult<ConflictAlertDto>>> Handle(
        GetConflictAlertsQuery request,
        CancellationToken cancellationToken)
    {
        var query = db.Set<ConflictAlert>().AsNoTracking().AsQueryable();

        if (request.IsResolved.HasValue)
            query = query.Where(a => a.IsResolved == request.IsResolved.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var alerts = await query
            .OrderByDescending(a => a.DetectedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        // Load sale numbers in batch
        var saleIds = alerts.Select(a => a.SaleId).Distinct().ToList();
        var saleNumbers = await db.Set<Sale>()
            .AsNoTracking()
            .Where(s => saleIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.SaleNumber, cancellationToken);

        var dtos = alerts
            .Select(a => a.ToDto(saleNumbers.TryGetValue(a.SaleId, out var sn) ? sn : a.SaleId.ToString()))
            .ToList();

        return Result<PagedResult<ConflictAlertDto>>.Success(new PagedResult<ConflictAlertDto>(
            Items: dtos,
            TotalCount: totalCount,
            Page: request.Page,
            PageSize: request.PageSize));
    }
}
