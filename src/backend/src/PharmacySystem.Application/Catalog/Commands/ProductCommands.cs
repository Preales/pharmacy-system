using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Catalog.Mappings;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;

namespace PharmacySystem.Application.Catalog.Commands;

// ─── Create Product ─────────────────────────────────────────────────────────

public record CreateProductCommand(
    string Name,
    string Sku,
    string? Description,
    decimal UnitPrice,
    decimal CostPrice,
    string Unit,
    string? Barcode,
    Guid CategoryId,
    Guid? SupplierId) : IRequest<Result<ProductDto>>;

public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(2000).When(x => x.Description is not null);
        RuleFor(x => x.UnitPrice).GreaterThan(0);
        RuleFor(x => x.CostPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Unit).NotEmpty()
            .Must(u => Enum.TryParse<ProductUnit>(u, true, out _))
            .WithMessage("Unit must be one of: Unit, Box, Blister, Bottle.");
        RuleFor(x => x.CategoryId).NotEmpty();
    }
}

public class CreateProductCommandHandler(
    IPharmacyDbContext db,
    ICurrentTenantService tenantService)
    : IRequestHandler<CreateProductCommand, Result<ProductDto>>
{
    public async Task<Result<ProductDto>> Handle(
        CreateProductCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;

        // SKU must be unique per tenant
        var skuExists = await db.Set<Product>()
            .AnyAsync(p => p.Sku == request.Sku, cancellationToken);

        if (skuExists)
            return Result<ProductDto>.Failure(
                new ConflictError("SKU_EXISTS", $"SKU '{request.Sku}' already exists."));

        // Validate referenced category exists (tenant-scoped via global filter)
        var categoryExists = await db.Set<Category>()
            .AnyAsync(c => c.Id == request.CategoryId, cancellationToken);

        if (!categoryExists)
            return Result<ProductDto>.Failure(
                new NotFoundError("CATEGORY_NOT_FOUND", $"Category {request.CategoryId} not found."));

        if (!Enum.TryParse<ProductUnit>(request.Unit, true, out var unit))
            return Result<ProductDto>.Failure(
                new ValidationError("INVALID_UNIT", "Invalid product unit.", new Dictionary<string, string[]>
                {
                    ["Unit"] = [$"Must be one of: {string.Join(", ", Enum.GetNames<ProductUnit>())}"]
                }));

        var product = new Product(
            tenantId, request.CategoryId, request.SupplierId,
            request.Name, request.Sku, request.Description,
            request.UnitPrice, request.CostPrice, unit, request.Barcode);

        db.Set<Product>().Add(product);
        await db.SaveChangesAsync(cancellationToken);

        // Reload with navigation properties
        var created = await db.Set<Product>()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstAsync(p => p.Id == product.Id, cancellationToken);

        return Result<ProductDto>.Success(created.ToDto());
    }
}

// ─── Update Product ─────────────────────────────────────────────────────────

public record UpdateProductCommand(
    Guid Id,
    string Name,
    string? Description,
    decimal UnitPrice,
    decimal CostPrice,
    string Unit,
    string? Barcode,
    Guid CategoryId,
    Guid? SupplierId) : IRequest<Result<ProductDto>>;

public class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Description).MaximumLength(2000).When(x => x.Description is not null);
        RuleFor(x => x.UnitPrice).GreaterThan(0);
        RuleFor(x => x.CostPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Unit).NotEmpty()
            .Must(u => Enum.TryParse<ProductUnit>(u, true, out _))
            .WithMessage("Unit must be one of: Unit, Box, Blister, Bottle.");
        RuleFor(x => x.CategoryId).NotEmpty();
    }
}

public class UpdateProductCommandHandler(IPharmacyDbContext db)
    : IRequestHandler<UpdateProductCommand, Result<ProductDto>>
{
    public async Task<Result<ProductDto>> Handle(
        UpdateProductCommand request,
        CancellationToken cancellationToken)
    {
        var product = await db.Set<Product>()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (product is null)
            return Result<ProductDto>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {request.Id} not found."));

        if (!Enum.TryParse<ProductUnit>(request.Unit, true, out var unit))
            return Result<ProductDto>.Failure(
                new ValidationError("INVALID_UNIT", "Invalid product unit.", new Dictionary<string, string[]>
                {
                    ["Unit"] = [$"Must be one of: {string.Join(", ", Enum.GetNames<ProductUnit>())}"]
                }));

        var categoryExists = await db.Set<Category>()
            .AnyAsync(c => c.Id == request.CategoryId, cancellationToken);

        if (!categoryExists)
            return Result<ProductDto>.Failure(
                new NotFoundError("CATEGORY_NOT_FOUND", $"Category {request.CategoryId} not found."));

        product.Update(request.Name, request.CategoryId, request.SupplierId,
            request.Description, request.UnitPrice, request.CostPrice, unit, request.Barcode);

        await db.SaveChangesAsync(cancellationToken);

        // Reload with navigation properties after update
        var updated = await db.Set<Product>()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstAsync(p => p.Id == request.Id, cancellationToken);

        return Result<ProductDto>.Success(updated.ToDto());
    }
}

// ─── Delete Product ──────────────────────────────────────────────────────────

public record DeleteProductCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteProductCommandHandler(IPharmacyDbContext db)
    : IRequestHandler<DeleteProductCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        DeleteProductCommand request,
        CancellationToken cancellationToken)
    {
        var product = await db.Set<Product>()
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (product is null)
            return Result<bool>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {request.Id} not found."));

        product.IsDeleted = true;
        product.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
