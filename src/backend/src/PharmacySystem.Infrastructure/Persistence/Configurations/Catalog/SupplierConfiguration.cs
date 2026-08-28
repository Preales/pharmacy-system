using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PharmacySystem.Domain.Catalog;

namespace PharmacySystem.Infrastructure.Persistence.Configurations.Catalog;

public class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.ToTable("Suppliers", "catalog");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.ContactName)
            .HasMaxLength(200);

        builder.Property(s => s.ContactEmail)
            .HasMaxLength(200);

        builder.Property(s => s.Phone)
            .HasMaxLength(50);

        builder.HasIndex(s => new { s.TenantId, s.Name })
            .HasFilter("[IsDeleted] = 0");
    }
}
