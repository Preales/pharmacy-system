using Microsoft.EntityFrameworkCore;

namespace PharmacySystem.Application.Common.Interfaces;

public interface IPharmacyDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    DbSet<TEntity> Set<TEntity>() where TEntity : class;
}
