using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;

namespace PharmacySystem.Infrastructure.Persistence.Interceptors;

public class TenantInterceptor(ICurrentTenantService tenantService) : SaveChangesInterceptor
{
    private readonly ICurrentTenantService _tenantService = tenantService;

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context is null) return base.SavingChangesAsync(eventData, result, cancellationToken);

        foreach (var entry in context.ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.TenantId = _tenantService.TenantId;
            }
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
