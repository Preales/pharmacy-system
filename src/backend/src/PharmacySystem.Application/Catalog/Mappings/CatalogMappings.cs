using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Domain.Catalog;

namespace PharmacySystem.Application.Catalog.Mappings;

public static class CategoryMappings
{
    public static CategoryDto ToDto(this Category category) => new(
        Id: category.Id,
        Name: category.Name,
        Description: category.Description,
        ParentCategoryId: category.ParentCategoryId,
        ParentCategoryName: category.ParentCategory?.Name,
        IsActive: category.IsActive);
}

public static class SupplierMappings
{
    public static SupplierDto ToDto(this Supplier supplier) => new(
        Id: supplier.Id,
        Name: supplier.Name,
        ContactName: supplier.ContactName,
        ContactEmail: supplier.ContactEmail,
        Phone: supplier.Phone,
        IsActive: supplier.IsActive);
}

public static class ProductMappings
{
    /// <summary>
    /// Maps a Product to ProductDto.
    /// Stock quantity must be supplied from InventoryItem.CurrentStock — Product no longer persists it.
    /// </summary>
    public static ProductDto ToDto(this Product product, int stockQuantity = 0) => new(
        Id: product.Id,
        Name: product.Name,
        Sku: product.Sku,
        Description: product.Description,
        UnitPrice: product.UnitPrice,
        CostPrice: product.CostPrice,
        Unit: product.Unit.ToString(),
        Barcode: product.Barcode,
        IsActive: product.IsActive,
        StockQuantity: stockQuantity,
        CategoryId: product.CategoryId,
        CategoryName: product.Category?.Name ?? string.Empty,
        SupplierId: product.SupplierId,
        SupplierName: product.Supplier?.Name);
}
