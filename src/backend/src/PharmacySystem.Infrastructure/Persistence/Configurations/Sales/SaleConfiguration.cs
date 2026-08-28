using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Infrastructure.Persistence.Configurations.Sales;

public class SaleConfiguration : IEntityTypeConfiguration<Sale>
{
    public void Configure(EntityTypeBuilder<Sale> builder)
    {
        builder.ToTable("Sales", "sales");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.SaleNumber)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(s => s.SaleDate)
            .IsRequired();

        builder.Property(s => s.CustomerId)
            .HasMaxLength(200);

        builder.Property(s => s.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(s => s.TotalAmount)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(s => s.IsOfflineSync)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(s => s.VoidReason)
            .HasMaxLength(500);

        // SaleLine as owned entity collection
        builder.OwnsMany(s => s.SaleLines, saleLineBuilder =>
        {
            saleLineBuilder.ToTable("SaleLines", "sales");

            saleLineBuilder.WithOwner().HasForeignKey(l => l.SaleId);

            saleLineBuilder.HasKey(l => l.Id);

            saleLineBuilder.Property(l => l.SaleId)
                .IsRequired();

            saleLineBuilder.Property(l => l.ProductId)
                .IsRequired();

            saleLineBuilder.Property(l => l.ProductName)
                .IsRequired()
                .HasMaxLength(300);

            saleLineBuilder.Property(l => l.Quantity)
                .IsRequired();

            saleLineBuilder.Property(l => l.UnitPrice)
                .IsRequired()
                .HasPrecision(18, 2);

            // Subtotal is computed — not stored (EF computed column formula not needed, calculated in C#)
            saleLineBuilder.Ignore(l => l.Subtotal);

            // Index for loading lines by product (reporting queries)
            saleLineBuilder.HasIndex(l => l.ProductId);
        });

        // Indexes
        builder.HasIndex(s => new { s.TenantId, s.SaleDate });
        builder.HasIndex(s => new { s.TenantId, s.SaleNumber }).IsUnique();
        builder.HasIndex(s => s.CustomerId);
    }
}
