using PharmacySystem.Application.Inventory.DTOs;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Inventory;

namespace PharmacySystem.Application.Inventory.Mappings;

public static class InventoryMappings
{
    public static InventoryItemDto ToDto(this InventoryItem item, Product product) => new(
        Id: item.Id,
        ProductId: item.ProductId,
        ProductName: product.Name,
        ProductSku: product.Sku,
        CurrentStock: item.CurrentStock,
        LowStockThreshold: item.LowStockThreshold,
        IsLowStock: item.IsLowStock);

    public static StockMovementDto ToDto(this StockMovement movement, string productName) => new(
        Id: movement.Id,
        ProductId: movement.ProductId,
        ProductName: productName,
        MovementType: movement.MovementType.ToString(),
        Quantity: movement.Quantity,
        UserId: movement.UserId,
        Reason: movement.Reason,
        BatchNumber: movement.BatchNumber,
        SupplierId: movement.SupplierId,
        Timestamp: movement.Timestamp);
}
