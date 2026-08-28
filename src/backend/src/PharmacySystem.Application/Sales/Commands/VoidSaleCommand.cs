using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common.Behaviors;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Sales.DTOs;
using PharmacySystem.Application.Sales.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Inventory;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Application.Sales.Commands;

// ─── Void Sale Command ────────────────────────────────────────────────────────

public record VoidSaleCommand(
    Guid SaleId,
    string Reason) : IRequest<Result<SaleDto>>, ITransactionalCommand;

public class VoidSaleCommandValidator : AbstractValidator<VoidSaleCommand>
{
    public VoidSaleCommandValidator()
    {
        RuleFor(x => x.SaleId).NotEmpty();
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("A void reason is required.")
            .MaximumLength(500);
    }
}

/// <summary>
/// Voids a completed sale atomically:
/// 1. Loads the sale with all lines
/// 2. Transitions status to Voided
/// 3. Creates Adjustment (Ingress) StockMovements to restore stock per line
/// 4. Restores stock via InventoryItem.CurrentStock (single source of truth)
/// 5. Resolves any open ConflictAlerts for this sale
/// </summary>
public class VoidSaleCommandHandler(
    IPharmacyDbContext db,
    ICurrentUserService userService)
    : IRequestHandler<VoidSaleCommand, Result<SaleDto>>
{
    public async Task<Result<SaleDto>> Handle(
        VoidSaleCommand request,
        CancellationToken cancellationToken)
    {
        var userId = userService.UserId ?? "system";

        // Load sale with lines (tenant-scoped via global filter)
        var sale = await db.Set<Sale>()
            .Include(s => s.SaleLines)
            .FirstOrDefaultAsync(s => s.Id == request.SaleId, cancellationToken);

        if (sale is null)
            return Result<SaleDto>.Failure(
                new NotFoundError("SALE_NOT_FOUND", $"Sale {request.SaleId} not found."));

        if (sale.Status != SaleStatus.Completed)
            return Result<SaleDto>.Failure(
                new ConflictError("SALE_NOT_VOIDABLE", $"Sale {sale.SaleNumber} cannot be voided. Current status: {sale.Status}."));

        // Void the aggregate
        sale.Void(request.Reason);

        // Restore stock for each line — InventoryItem is the single source of truth for stock.
        var productIds = sale.SaleLines.Select(l => l.ProductId).Distinct().ToList();

        var inventoryItems = await db.Set<InventoryItem>()
            .Where(i => productIds.Contains(i.ProductId))
            .ToDictionaryAsync(i => i.ProductId, cancellationToken);

        foreach (var line in sale.SaleLines)
        {
            var restoreQty = line.Quantity; // positive — restores stock

            if (inventoryItems.TryGetValue(line.ProductId, out var inventoryItem))
            {
                inventoryItem.ApplyMovement(restoreQty);
            }
            // Note: Product no longer stores StockQuantity — InventoryItem is the single source of truth.

            var movement = new StockMovement(
                tenantId: sale.TenantId,
                productId: line.ProductId,
                movementType: MovementType.Adjustment,
                quantity: restoreQty,
                userId: userId,
                reason: $"Sale voided: {sale.SaleNumber} — {request.Reason}");

            db.Set<StockMovement>().Add(movement);
        }

        // Resolve open ConflictAlerts for this sale
        var openAlerts = await db.Set<ConflictAlert>()
            .Where(a => a.SaleId == request.SaleId && !a.IsResolved)
            .ToListAsync(cancellationToken);

        foreach (var alert in openAlerts)
        {
            alert.Resolve(userId);
        }

        await db.SaveChangesAsync(cancellationToken);

        return Result<SaleDto>.Success(sale.ToDto());
    }
}
