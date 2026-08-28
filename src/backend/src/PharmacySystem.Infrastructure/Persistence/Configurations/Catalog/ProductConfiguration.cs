using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PharmacySystem.Domain.Catalog;

namespace PharmacySystem.Infrastructure.Persistence.Configurations.Catalog;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products", "catalog");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(p => p.Sku)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Description)
            .HasMaxLength(2000);

        builder.Property(p => p.UnitPrice)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(p => p.CostPrice)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(p => p.Unit)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(p => p.Barcode)
            .HasMaxLength(100);

        // SKU must be unique per tenant (excluding soft-deleted)
        builder.HasIndex(p => new { p.TenantId, p.Sku })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        // FK to Category
        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // FK to Supplier (optional)
        builder.HasOne(p => p.Supplier)
            .WithMany(s => s.Products)
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
