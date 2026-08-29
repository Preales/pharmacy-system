namespace PharmacySystem.Application.Inventory.DTOs;

public record InventoryItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSku,
    int CurrentStock,
    int LowStockThreshold,
    bool IsLowStock,
    DateTime? LastMovementDate = null);

public record StockMovementDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string MovementType,
    int Quantity,
    string UserId,
    string? Reason,
    string? BatchNumber,
    Guid? SupplierId,
    DateTime Timestamp);
