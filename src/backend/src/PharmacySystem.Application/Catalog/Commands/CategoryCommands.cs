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

// ─── Create Category ────────────────────────────────────────────────────────

public record CreateCategoryCommand(
    string Name,
    string? Description,
    Guid? ParentCategoryId) : IRequest<Result<CategoryDto>>;

public class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(1000).When(x => x.Description is not null);
    }
}

public class CreateCategoryCommandHandler(
    IPharmacyDbContext db,
    ICurrentTenantService tenantService)
    : IRequestHandler<CreateCategoryCommand, Result<CategoryDto>>
{
    public async Task<Result<CategoryDto>> Handle(
        CreateCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;

        // Enforce unique name per tenant
        var exists = await db.Set<Category>()
            .AnyAsync(c => c.Name == request.Name, cancellationToken);

        if (exists)
            return Result<CategoryDto>.Failure(
                new ConflictError("CATEGORY_NAME_EXISTS", $"Category '{request.Name}' already exists."));

        var category = new Category(tenantId, request.Name, request.Description, request.ParentCategoryId);
        db.Set<Category>().Add(category);
        await db.SaveChangesAsync(cancellationToken);

        return Result<CategoryDto>.Success(category.ToDto());
    }
}

// ─── Update Category ────────────────────────────────────────────────────────

public record UpdateCategoryCommand(
    Guid Id,
    string Name,
    string? Description,
    Guid? ParentCategoryId) : IRequest<Result<CategoryDto>>;

public class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(1000).When(x => x.Description is not null);
    }
}

public class UpdateCategoryCommandHandler(IPharmacyDbContext db)
    : IRequestHandler<UpdateCategoryCommand, Result<CategoryDto>>
{
    public async Task<Result<CategoryDto>> Handle(
        UpdateCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var category = await db.Set<Category>()
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (category is null)
            return Result<CategoryDto>.Failure(
                new NotFoundError("CATEGORY_NOT_FOUND", $"Category {request.Id} not found."));

        // Check name uniqueness excluding self
        var nameConflict = await db.Set<Category>()
            .AnyAsync(c => c.Name == request.Name && c.Id != request.Id, cancellationToken);

        if (nameConflict)
            return Result<CategoryDto>.Failure(
                new ConflictError("CATEGORY_NAME_EXISTS", $"Category '{request.Name}' already exists."));

        category.Update(request.Name, request.Description, request.ParentCategoryId);
        await db.SaveChangesAsync(cancellationToken);

        return Result<CategoryDto>.Success(category.ToDto());
    }
}

// ─── Delete Category ────────────────────────────────────────────────────────

public record DeleteCategoryCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteCategoryCommandHandler(IPharmacyDbContext db)
    : IRequestHandler<DeleteCategoryCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        DeleteCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var category = await db.Set<Category>()
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (category is null)
            return Result<bool>.Failure(
                new NotFoundError("CATEGORY_NOT_FOUND", $"Category {request.Id} not found."));

        // Block deletion if there are active products in this category
        var hasProducts = await db.Set<Product>()
            .AnyAsync(p => p.CategoryId == request.Id && p.IsActive, cancellationToken);

        if (hasProducts)
            return Result<bool>.Failure(
                new ConflictError("CATEGORY_HAS_PRODUCTS", "Category has associated products and cannot be deleted."));

        category.IsDeleted = true;
        category.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
