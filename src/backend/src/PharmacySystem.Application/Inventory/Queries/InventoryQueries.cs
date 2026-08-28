using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Inventory.DTOs;
using PharmacySystem.Application.Inventory.Mappings;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Inventory;

namespace PharmacySystem.Application.Inventory.Queries;

// ─── Get Inventory Item (single product stock level) ─────────────────────────

public record GetInventoryItemQuery(Guid ProductId) : IRequest<Result<InventoryItemDto>>;

public class GetInventoryItemQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetInventoryItemQuery, Result<InventoryItemDto>>
{
    public async Task<Result<InventoryItemDto>> Handle(
        GetInventoryItemQuery request,
        CancellationToken cancellationToken)
    {
        var product = await db.Set<Product>()
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);

        if (product is null)
            return Result<InventoryItemDto>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {request.ProductId} not found."));

        var item = await db.Set<InventoryItem>()
            .FirstOrDefaultAsync(i => i.ProductId == request.ProductId, cancellationToken);

        // Return zero-stock item if no InventoryItem exists yet
        var dto = item is not null
            ? item.ToDto(product)
            : new InventoryItemDto(
                Id: Guid.Empty,
                ProductId: product.Id,
                ProductName: product.Name,
                ProductSku: product.Sku,
                CurrentStock: 0,
                LowStockThreshold: 10,
                IsLowStock: true);

        return Result<InventoryItemDto>.Success(dto);
    }
}

// ─── Get Low Stock Items ──────────────────────────────────────────────────────

public record GetLowStockItemsQuery(int Page = 1, int PageSize = 20)
    : IRequest<Result<PagedResult<InventoryItemDto>>>;

public class GetLowStockItemsQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetLowStockItemsQuery, Result<PagedResult<InventoryItemDto>>>
{
    public async Task<Result<PagedResult<InventoryItemDto>>> Handle(
        GetLowStockItemsQuery request,
        CancellationToken cancellationToken)
    {
        // Items explicitly below threshold
        var query = db.Set<InventoryItem>()
            .Where(i => i.CurrentStock <= i.LowStockThreshold);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(i => i.CurrentStock)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var productIds = items.Select(i => i.ProductId).ToList();
        var products = await db.Set<Product>()
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        var dtos = items
            .Where(i => products.ContainsKey(i.ProductId))
            .Select(i => i.ToDto(products[i.ProductId]))
            .ToList();

        return Result<PagedResult<InventoryItemDto>>.Success(
            new PagedResult<InventoryItemDto>(dtos, total, request.Page, request.PageSize));
    }
}

// ─── Get Movement History ─────────────────────────────────────────────────────

public record GetMovementHistoryQuery(
    Guid ProductId,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<StockMovementDto>>>;

public class GetMovementHistoryQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetMovementHistoryQuery, Result<PagedResult<StockMovementDto>>>
{
    public async Task<Result<PagedResult<StockMovementDto>>> Handle(
        GetMovementHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var product = await db.Set<Product>()
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);

        if (product is null)
            return Result<PagedResult<StockMovementDto>>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {request.ProductId} not found."));

        var query = db.Set<StockMovement>()
            .Where(m => m.ProductId == request.ProductId)
            .OrderBy(m => m.Timestamp);

        var total = await query.CountAsync(cancellationToken);

        var movements = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = movements.Select(m => m.ToDto(product.Name)).ToList();

        return Result<PagedResult<StockMovementDto>>.Success(
            new PagedResult<StockMovementDto>(dtos, total, request.Page, request.PageSize));
    }
}
