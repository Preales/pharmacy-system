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

// ─── Get All Inventory Items (paginated, optional search) ────────────────────

public record GetAllInventoryItemsQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null) : IRequest<Result<PagedResult<InventoryItemDto>>>;

public class GetAllInventoryItemsQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetAllInventoryItemsQuery, Result<PagedResult<InventoryItemDto>>>
{
    public async Task<Result<PagedResult<InventoryItemDto>>> Handle(
        GetAllInventoryItemsQuery request,
        CancellationToken cancellationToken)
    {
        // Load products — apply optional search filter
        var productsQuery = db.Set<Product>().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var searchTerm = request.Search.Trim().ToLower();
            productsQuery = productsQuery.Where(p =>
                p.Name.ToLower().Contains(searchTerm) ||
                p.Sku.ToLower().Contains(searchTerm));
        }

        var total = await productsQuery.CountAsync(cancellationToken);

        var products = await productsQuery
            .OrderBy(p => p.Name)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        if (products.Count == 0)
            return Result<PagedResult<InventoryItemDto>>.Success(
                new PagedResult<InventoryItemDto>([], total, request.Page, request.PageSize));

        var productIds = products.Select(p => p.Id).ToList();

        // Load inventory items for the current page of products (LEFT JOIN semantics: use dictionary)
        var inventoryItems = await db.Set<InventoryItem>()
            .Where(i => productIds.Contains(i.ProductId))
            .ToDictionaryAsync(i => i.ProductId, cancellationToken);

        // Load the latest stock movement date per product
        var lastMovements = await db.Set<StockMovement>()
            .Where(m => productIds.Contains(m.ProductId))
            .GroupBy(m => m.ProductId)
            .Select(g => new { ProductId = g.Key, LastDate = g.Max(m => m.Timestamp) })
            .ToDictionaryAsync(x => x.ProductId, x => (DateTime?)x.LastDate, cancellationToken);

        var dtos = products.Select(product =>
        {
            inventoryItems.TryGetValue(product.Id, out var item);
            lastMovements.TryGetValue(product.Id, out var lastDate);

            return item is not null
                ? item.ToDto(product) with { LastMovementDate = lastDate }
                : new InventoryItemDto(
                    Id: Guid.Empty,
                    ProductId: product.Id,
                    ProductName: product.Name,
                    ProductSku: product.Sku,
                    CurrentStock: 0,
                    LowStockThreshold: 10,
                    IsLowStock: true,
                    LastMovementDate: lastDate);
        }).ToList();

        return Result<PagedResult<InventoryItemDto>>.Success(
            new PagedResult<InventoryItemDto>(dtos, total, request.Page, request.PageSize));
    }
}

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
