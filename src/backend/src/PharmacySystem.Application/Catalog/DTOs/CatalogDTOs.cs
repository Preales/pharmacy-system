using PharmacySystem.Domain.Catalog;

namespace PharmacySystem.Application.Catalog.DTOs;

public record CategoryDto(
    Guid Id,
    string Name,
    string? Description,
    Guid? ParentCategoryId,
    string? ParentCategoryName,
    bool IsActive);

public record SupplierDto(
    Guid Id,
    string Name,
    string? ContactName,
    string? ContactEmail,
    string? Phone,
    bool IsActive);

public record ProductDto(
    Guid Id,
    string Name,
    string Sku,
    string? Description,
    decimal UnitPrice,
    decimal CostPrice,
    string Unit,
    string? Barcode,
    bool IsActive,
    int StockQuantity,   // sourced from InventoryItem.CurrentStock — not stored on Product
    Guid CategoryId,
    string CategoryName,
    Guid? SupplierId,
    string? SupplierName);

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}
