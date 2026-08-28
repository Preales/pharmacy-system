using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Domain.Sales;
using PharmacySystem.Infrastructure.Persistence;

namespace PharmacySystem.Infrastructure.Services;

/// <summary>
/// Generates sequential sale numbers in format SALE-{YYYYMMDD}-{4-digit-sequence}.
/// Sequence is per-tenant per UTC calendar day and resets to 0001 each day.
/// Uses a DB query to find the last sale number for today, then increments.
/// Thread safety is guaranteed by the surrounding DB transaction (TransactionBehavior).
/// </summary>
public class SaleNumberService(PharmacyDbContext dbContext) : ISaleNumberService
{
    public async Task<string> GenerateAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var datePrefix = today.ToString("yyyyMMdd");
        var prefix = $"SALE-{datePrefix}-";

        // Find the last sale number for this tenant today to determine the next sequence
        var lastSaleNumber = await dbContext.Sales
            .IgnoreQueryFilters() // bypass tenant filter — we need the raw sequence
            .Where(s => s.TenantId == tenantId && s.SaleNumber.StartsWith(prefix))
            .Select(s => s.SaleNumber)
            .OrderByDescending(n => n)
            .FirstOrDefaultAsync(cancellationToken);

        int nextSequence = 1;

        if (lastSaleNumber is not null)
        {
            // Extract the numeric suffix after the last dash
            var parts = lastSaleNumber.Split('-');
            if (parts.Length >= 3 && int.TryParse(parts[^1], out var lastSeq))
                nextSequence = lastSeq + 1;
        }

        return $"{prefix}{nextSequence:D4}";
    }
}
