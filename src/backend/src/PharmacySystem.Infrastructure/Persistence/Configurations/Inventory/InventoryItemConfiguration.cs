using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PharmacySystem.Domain.Inventory;

namespace PharmacySystem.Infrastructure.Persistence.Configurations.Inventory;

public class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    public void Configure(EntityTypeBuilder<InventoryItem> builder)
    {
        builder.ToTable("InventoryItems", "inventory");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.ProductId)
            .IsRequired();

        builder.Property(i => i.CurrentStock)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(i => i.LowStockThreshold)
            .IsRequired()
            .HasDefaultValue(10);

        // One InventoryItem per product per tenant
        builder.HasIndex(i => new { i.TenantId, i.ProductId })
            .IsUnique();

        // Index for low-stock queries
        builder.HasIndex(i => new { i.TenantId, i.CurrentStock, i.LowStockThreshold });
    }
}
