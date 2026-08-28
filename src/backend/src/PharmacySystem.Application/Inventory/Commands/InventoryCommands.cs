using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Inventory.DTOs;
using PharmacySystem.Application.Inventory.Mappings;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Inventory;

namespace PharmacySystem.Application.Inventory.Commands;

// ─── Record Stock Ingress ────────────────────────────────────────────────────

public record RecordIngressCommand(
    Guid ProductId,
    int Quantity,
    Guid? SupplierId,
    string? BatchNumber) : IRequest<Result<StockMovementDto>>;

public class RecordIngressCommandValidator : AbstractValidator<RecordIngressCommand>
{
    public RecordIngressCommandValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Ingress quantity must be positive.");
        RuleFor(x => x.BatchNumber).MaximumLength(100).When(x => x.BatchNumber is not null);
    }
}

public class RecordIngressCommandHandler(
    IPharmacyDbContext db,
    ICurrentTenantService tenantService,
    ICurrentUserService userService)
    : IRequestHandler<RecordIngressCommand, Result<StockMovementDto>>
{
    public async Task<Result<StockMovementDto>> Handle(
        RecordIngressCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;
        var userId = userService.UserId ?? "system";

        // Validate product exists (tenant-scoped via global filter)
        var product = await db.Set<Product>()
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);

        if (product is null)
            return Result<StockMovementDto>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {request.ProductId} not found."));

        // Get or create InventoryItem
        var inventoryItem = await db.Set<InventoryItem>()
            .FirstOrDefaultAsync(i => i.ProductId == request.ProductId, cancellationToken);

        if (inventoryItem is null)
        {
            inventoryItem = new InventoryItem(tenantId, request.ProductId);
            db.Set<InventoryItem>().Add(inventoryItem);
        }

        // Create movement
        var movement = new StockMovement(
            tenantId: tenantId,
            productId: request.ProductId,
            movementType: MovementType.Ingress,
            quantity: request.Quantity,
            userId: userId,
            reason: null,
            batchNumber: request.BatchNumber,
            supplierId: request.SupplierId);

        db.Set<StockMovement>().Add(movement);

        // Update inventory item — single source of truth for stock
        inventoryItem.ApplyMovement(request.Quantity);

        await db.SaveChangesAsync(cancellationToken);

        return Result<StockMovementDto>.Success(movement.ToDto(product.Name));
    }
}

// ─── Create Stock Adjustment ─────────────────────────────────────────────────

public record CreateAdjustmentCommand(
    Guid ProductId,
    int Quantity,
    string Reason) : IRequest<Result<StockMovementDto>>;

public class CreateAdjustmentCommandValidator : AbstractValidator<CreateAdjustmentCommand>
{
    public CreateAdjustmentCommandValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).NotEqual(0).WithMessage("Adjustment quantity cannot be zero.");
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500).WithMessage("Reason is required for adjustments.");
    }
}

public class CreateAdjustmentCommandHandler(
    IPharmacyDbContext db,
    ICurrentTenantService tenantService,
    ICurrentUserService userService)
    : IRequestHandler<CreateAdjustmentCommand, Result<StockMovementDto>>
{
    public async Task<Result<StockMovementDto>> Handle(
        CreateAdjustmentCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;
        var userId = userService.UserId ?? "system";

        var product = await db.Set<Product>()
            .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);

        if (product is null)
            return Result<StockMovementDto>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {request.ProductId} not found."));

        var inventoryItem = await db.Set<InventoryItem>()
            .FirstOrDefaultAsync(i => i.ProductId == request.ProductId, cancellationToken);

        if (inventoryItem is null)
        {
            inventoryItem = new InventoryItem(tenantId, request.ProductId);
            db.Set<InventoryItem>().Add(inventoryItem);
        }

        var movement = new StockMovement(
            tenantId: tenantId,
            productId: request.ProductId,
            movementType: MovementType.Adjustment,
            quantity: request.Quantity,
            userId: userId,
            reason: request.Reason);

        db.Set<StockMovement>().Add(movement);

        inventoryItem.ApplyMovement(request.Quantity);

        await db.SaveChangesAsync(cancellationToken);

        return Result<StockMovementDto>.Success(movement.ToDto(product.Name));
    }
}
