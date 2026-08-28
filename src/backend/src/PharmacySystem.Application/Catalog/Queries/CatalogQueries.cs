using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Catalog.Mappings;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Inventory;

namespace PharmacySystem.Application.Catalog.Queries;

// ─── Get Products (paginated + filterable) ──────────────────────────────────

public record GetProductsQuery(
    string? Search = null,
    Guid? CategoryId = null,
    Guid? SupplierId = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<ProductDto>>>;

public class GetProductsQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetProductsQuery, Result<PagedResult<ProductDto>>>
{
    public async Task<Result<PagedResult<ProductDto>>> Handle(
        GetProductsQuery request,
        CancellationToken cancellationToken)
    {
        var query = db.Set<Product>()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(search) ||
                p.Sku.ToLower().Contains(search) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(search)));
        }

        if (request.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);

        if (request.SupplierId.HasValue)
            query = query.Where(p => p.SupplierId == request.SupplierId.Value);

        if (request.IsActive.HasValue)
            query = query.Where(p => p.IsActive == request.IsActive.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Join with InventoryItem to get current stock — single source of truth.
        var productIds = items.Select(p => p.Id).ToList();
        var stockMap = await db.Set<InventoryItem>()
            .Where(i => productIds.Contains(i.ProductId))
            .ToDictionaryAsync(i => i.ProductId, i => i.CurrentStock, cancellationToken);

        var result = new PagedResult<ProductDto>(
            items.Select(p => p.ToDto(stockMap.GetValueOrDefault(p.Id, 0))).ToList(),
            totalCount, page, pageSize);

        return Result<PagedResult<ProductDto>>.Success(result);
    }
}

// ─── Get Product By Id ───────────────────────────────────────────────────────

public record GetProductByIdQuery(Guid Id) : IRequest<Result<ProductDto>>;

public class GetProductByIdQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetProductByIdQuery, Result<ProductDto>>
{
    public async Task<Result<ProductDto>> Handle(
        GetProductByIdQuery request,
        CancellationToken cancellationToken)
    {
        var product = await db.Set<Product>()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (product is null)
            return Result<ProductDto>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {request.Id} not found."));

        // Get current stock from InventoryItem — single source of truth.
        var inventoryItem = await db.Set<InventoryItem>()
            .FirstOrDefaultAsync(i => i.ProductId == product.Id, cancellationToken);

        return Result<ProductDto>.Success(product.ToDto(inventoryItem?.CurrentStock ?? 0));
    }
}

// ─── Get Categories ──────────────────────────────────────────────────────────

public record GetCategoriesQuery(bool? IsActive = null) : IRequest<Result<IReadOnlyList<CategoryDto>>>;

public class GetCategoriesQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetCategoriesQuery, Result<IReadOnlyList<CategoryDto>>>
{
    public async Task<Result<IReadOnlyList<CategoryDto>>> Handle(
        GetCategoriesQuery request,
        CancellationToken cancellationToken)
    {
        var query = db.Set<Category>()
            .Include(c => c.ParentCategory)
            .AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(c => c.IsActive == request.IsActive.Value);

        var categories = await query
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<CategoryDto>>.Success(
            categories.Select(c => c.ToDto()).ToList());
    }
}

// ─── Get Category By Id ──────────────────────────────────────────────────────

public record GetCategoryByIdQuery(Guid Id) : IRequest<Result<CategoryDto>>;

public class GetCategoryByIdQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetCategoryByIdQuery, Result<CategoryDto>>
{
    public async Task<Result<CategoryDto>> Handle(
        GetCategoryByIdQuery request,
        CancellationToken cancellationToken)
    {
        var category = await db.Set<Category>()
            .Include(c => c.ParentCategory)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (category is null)
            return Result<CategoryDto>.Failure(
                new NotFoundError("CATEGORY_NOT_FOUND", $"Category {request.Id} not found."));

        return Result<CategoryDto>.Success(category.ToDto());
    }
}

// ─── Get Suppliers ───────────────────────────────────────────────────────────

public record GetSuppliersQuery(bool? IsActive = null) : IRequest<Result<IReadOnlyList<SupplierDto>>>;

public class GetSuppliersQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetSuppliersQuery, Result<IReadOnlyList<SupplierDto>>>
{
    public async Task<Result<IReadOnlyList<SupplierDto>>> Handle(
        GetSuppliersQuery request,
        CancellationToken cancellationToken)
    {
        var query = db.Set<Supplier>().AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(s => s.IsActive == request.IsActive.Value);

        var suppliers = await query
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SupplierDto>>.Success(
            suppliers.Select(s => s.ToDto()).ToList());
    }
}

// ─── Get Supplier By Id ──────────────────────────────────────────────────────

public record GetSupplierByIdQuery(Guid Id) : IRequest<Result<SupplierDto>>;

public class GetSupplierByIdQueryHandler(IPharmacyDbContext db)
    : IRequestHandler<GetSupplierByIdQuery, Result<SupplierDto>>
{
    public async Task<Result<SupplierDto>> Handle(
        GetSupplierByIdQuery request,
        CancellationToken cancellationToken)
    {
        var supplier = await db.Set<Supplier>()
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (supplier is null)
            return Result<SupplierDto>.Failure(
                new NotFoundError("SUPPLIER_NOT_FOUND", $"Supplier {request.Id} not found."));

        return Result<SupplierDto>.Success(supplier.ToDto());
    }
}
