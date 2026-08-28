using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Catalog;

/// <summary>
/// Unit of measure for a product package.
/// </summary>
public enum ProductUnit
{
    Unit = 0,
    Box = 1,
    Blister = 2,
    Bottle = 3
}

public class Product : AggregateRoot
{
    private Product() { } // EF constructor

    public Product(
        Guid tenantId,
        Guid categoryId,
        Guid? supplierId,
        string name,
        string sku,
        string? description,
        decimal unitPrice,
        decimal costPrice,
        ProductUnit unit,
        string? barcode = null)
    {
        TenantId = tenantId;
        CategoryId = categoryId;
        SupplierId = supplierId;
        Name = name;
        Sku = sku;
        Description = description;
        UnitPrice = unitPrice;
        CostPrice = costPrice;
        Unit = unit;
        Barcode = barcode;
        IsActive = true;

        AddDomainEvent(new ProductCreatedEvent(Id, tenantId, name, sku));
    }

    public string Name { get; private set; } = string.Empty;
    public string Sku { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal CostPrice { get; private set; }
    public ProductUnit Unit { get; private set; }
    public string? Barcode { get; private set; }
    public bool IsActive { get; private set; }

    // Stock is NOT stored on Product — InventoryItem is the single source of truth.
    // Use InventoryItem.CurrentStock for all stock reads.
    // StockQuantity was removed to eliminate dual-write inconsistency risk.

    public Guid CategoryId { get; private set; }
    public Guid? SupplierId { get; private set; }

    // Navigation
    public Category? Category { get; private set; }
    public Supplier? Supplier { get; private set; }

    public void Update(
        string name,
        Guid categoryId,
        Guid? supplierId,
        string? description,
        decimal unitPrice,
        decimal costPrice,
        ProductUnit unit,
        string? barcode = null)
    {
        Name = name;
        CategoryId = categoryId;
        SupplierId = supplierId;
        Description = description;
        UnitPrice = unitPrice;
        CostPrice = costPrice;
        Unit = unit;
        Barcode = barcode;

        AddDomainEvent(new ProductUpdatedEvent(Id, TenantId, name));
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
