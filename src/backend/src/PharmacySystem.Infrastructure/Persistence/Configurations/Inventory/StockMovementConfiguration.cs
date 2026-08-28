using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PharmacySystem.Domain.Inventory;

namespace PharmacySystem.Infrastructure.Persistence.Configurations.Inventory;

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.ToTable("StockMovements", "inventory");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.ProductId)
            .IsRequired();

        builder.Property(m => m.MovementType)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(m => m.Quantity)
            .IsRequired();

        builder.Property(m => m.UserId)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(m => m.Reason)
            .HasMaxLength(500);

        builder.Property(m => m.BatchNumber)
            .HasMaxLength(100);

        builder.Property(m => m.Timestamp)
            .IsRequired();

        // Optimized for product movement history queries
        builder.HasIndex(m => new { m.TenantId, m.ProductId, m.Timestamp });

        // Optimized for date-range reporting
        builder.HasIndex(m => new { m.TenantId, m.Timestamp });

        // Movements are immutable — no soft-delete column needed,
        // but Entity base class still carries IsDeleted; we just never set it.
    }
}
