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

// ─── Create Supplier ────────────────────────────────────────────────────────

public record CreateSupplierCommand(
    string Name,
    string? ContactName,
    string? ContactEmail,
    string? Phone) : IRequest<Result<SupplierDto>>;

public class CreateSupplierCommandValidator : AbstractValidator<CreateSupplierCommand>
{
    public CreateSupplierCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContactEmail)
            .EmailAddress()
            .MaximumLength(200)
            .When(x => x.ContactEmail is not null);
        RuleFor(x => x.Phone).MaximumLength(50).When(x => x.Phone is not null);
    }
}

public class CreateSupplierCommandHandler(
    IPharmacyDbContext db,
    ICurrentTenantService tenantService)
    : IRequestHandler<CreateSupplierCommand, Result<SupplierDto>>
{
    public async Task<Result<SupplierDto>> Handle(
        CreateSupplierCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;

        var supplier = new Supplier(
            tenantId, request.Name, request.ContactName, request.ContactEmail, request.Phone);

        db.Set<Supplier>().Add(supplier);
        await db.SaveChangesAsync(cancellationToken);

        return Result<SupplierDto>.Success(supplier.ToDto());
    }
}

// ─── Update Supplier ────────────────────────────────────────────────────────

public record UpdateSupplierCommand(
    Guid Id,
    string Name,
    string? ContactName,
    string? ContactEmail,
    string? Phone) : IRequest<Result<SupplierDto>>;

public class UpdateSupplierCommandValidator : AbstractValidator<UpdateSupplierCommand>
{
    public UpdateSupplierCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContactEmail)
            .EmailAddress()
            .MaximumLength(200)
            .When(x => x.ContactEmail is not null);
        RuleFor(x => x.Phone).MaximumLength(50).When(x => x.Phone is not null);
    }
}

public class UpdateSupplierCommandHandler(IPharmacyDbContext db)
    : IRequestHandler<UpdateSupplierCommand, Result<SupplierDto>>
{
    public async Task<Result<SupplierDto>> Handle(
        UpdateSupplierCommand request,
        CancellationToken cancellationToken)
    {
        var supplier = await db.Set<Supplier>()
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (supplier is null)
            return Result<SupplierDto>.Failure(
                new NotFoundError("SUPPLIER_NOT_FOUND", $"Supplier {request.Id} not found."));

        supplier.Update(request.Name, request.ContactName, request.ContactEmail, request.Phone);
        await db.SaveChangesAsync(cancellationToken);

        return Result<SupplierDto>.Success(supplier.ToDto());
    }
}

// ─── Delete Supplier (soft-delete) ──────────────────────────────────────────

public record DeleteSupplierCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteSupplierCommandHandler(IPharmacyDbContext db)
    : IRequestHandler<DeleteSupplierCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        DeleteSupplierCommand request,
        CancellationToken cancellationToken)
    {
        var supplier = await db.Set<Supplier>()
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (supplier is null)
            return Result<bool>.Failure(
                new NotFoundError("SUPPLIER_NOT_FOUND", $"Supplier {request.Id} not found."));

        supplier.IsDeleted = true;
        supplier.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
