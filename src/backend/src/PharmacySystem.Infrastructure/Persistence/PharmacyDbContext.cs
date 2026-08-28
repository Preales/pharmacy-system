using System.Linq.Expressions;
using System.Reflection;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Identity;
using PharmacySystem.Domain.Inventory;
using PharmacySystem.Domain.Sales;
using PharmacySystem.Infrastructure.Identity;

namespace PharmacySystem.Infrastructure.Persistence;

public class PharmacyDbContext(
    DbContextOptions<PharmacyDbContext> options,
    ICurrentTenantService tenantService)
    : IdentityDbContext<ApplicationUser, ApplicationRole, string>(options), IPharmacyDbContext
{
    private readonly ICurrentTenantService _tenantService = tenantService;

    // Identity
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Catalog
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    // Inventory
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();

    // Sales
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<ConflictAlert> ConflictAlerts => Set<ConflictAlert>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Move ASP.NET Identity tables to "identity" schema
        builder.Entity<ApplicationUser>().ToTable("Users", "identity");
        builder.Entity<ApplicationRole>().ToTable("Roles", "identity");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<string>>().ToTable("UserRoles", "identity");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserClaim<string>>().ToTable("UserClaims", "identity");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<string>>().ToTable("UserLogins", "identity");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<string>>().ToTable("UserTokens", "identity");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityRoleClaim<string>>().ToTable("RoleClaims", "identity");

        // Apply tenant + soft-delete global query filter to all Entity-derived types.
        //
        // CONVENTION — Owned entities and the !entityType.IsOwned() guard:
        //   Any class that extends Entity and is configured as an EF owned entity
        //   (via OwnsMany / OwnsOne) MUST be excluded from this loop. EF does not allow
        //   calling builder.Entity<T>() after an owned-entity configuration is applied —
        //   doing so throws an InvalidOperationException at model creation time.
        //
        //   The guard `!entityType.IsOwned()` handles this automatically. Owned entities
        //   inherit the parent aggregate's query filter through the ownership relationship,
        //   so they do not need a separate filter.
        //
        //   RULE: If you add a new owned entity that extends Entity, do NOT register it
        //   directly in DbContext — configure it only via OwnsMany/OwnsOne on its parent.
        //   The !IsOwned() guard will then exclude it from this loop safely.
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(Entity).IsAssignableFrom(entityType.ClrType) && !entityType.IsOwned())
            {
                builder.Entity(entityType.ClrType)
                    .HasQueryFilter(BuildTenantAndSoftDeleteFilter(entityType.ClrType));
            }
        }
    }

    private LambdaExpression BuildTenantAndSoftDeleteFilter(Type entityType)
    {
        // e => e.TenantId == _tenantService.TenantId && !e.IsDeleted
        var parameter = Expression.Parameter(entityType, "e");

        var tenantIdProperty = Expression.Property(parameter, nameof(Entity.TenantId));
        var currentTenantId = Expression.Property(
            Expression.Constant(_tenantService),
            nameof(ICurrentTenantService.TenantId));
        var tenantFilter = Expression.Equal(tenantIdProperty, currentTenantId);

        var isDeletedProperty = Expression.Property(parameter, nameof(Entity.IsDeleted));
        var notDeleted = Expression.Not(isDeletedProperty);

        var combined = Expression.AndAlso(tenantFilter, notDeleted);

        return Expression.Lambda(combined, parameter);
    }
}
