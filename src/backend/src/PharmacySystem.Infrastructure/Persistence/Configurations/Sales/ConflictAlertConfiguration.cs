using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Infrastructure.Persistence.Configurations.Sales;

public class ConflictAlertConfiguration : IEntityTypeConfiguration<ConflictAlert>
{
    public void Configure(EntityTypeBuilder<ConflictAlert> builder)
    {
        builder.ToTable("ConflictAlerts", "sales");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.SaleId)
            .IsRequired();

        builder.Property(a => a.ProductId)
            .IsRequired();

        builder.Property(a => a.ProductName)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(a => a.ExpectedStock)
            .IsRequired();

        builder.Property(a => a.ActualStock)
            .IsRequired();

        builder.Property(a => a.DetectedAt)
            .IsRequired();

        builder.Property(a => a.ResolvedBy)
            .HasMaxLength(450); // Identity UserId max length

        builder.Property(a => a.IsResolved)
            .IsRequired()
            .HasDefaultValue(false);

        // Indexes
        builder.HasIndex(a => new { a.TenantId, a.IsResolved });
        builder.HasIndex(a => a.SaleId);
        builder.HasIndex(a => a.ProductId);
    }
}
