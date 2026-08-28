using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common.Behaviors;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Sales.DTOs;
using PharmacySystem.Application.Sales.Mappings;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Inventory;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Application.Sales.Commands;

// ─── Create Sale Command ─────────────────────────────────────────────────────

public record CreateSaleLineRequest(
    Guid ProductId,
    int Quantity);

public record CreateSaleCommand(
    IReadOnlyList<CreateSaleLineRequest> Lines,
    string? CustomerId,
    bool IsOfflineSync) : IRequest<Result<SaleDto>>, ITransactionalCommand;

public class CreateSaleCommandValidator : AbstractValidator<CreateSaleCommand>
{
    public CreateSaleCommandValidator()
    {
        RuleFor(x => x.Lines)
            .NotEmpty().WithMessage("A sale must have at least one line item.");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ProductId).NotEmpty();
            line.RuleFor(l => l.Quantity)
                .GreaterThan(0).WithMessage("Quantity must be greater than zero.");
        });

        RuleFor(x => x.CustomerId)
            .MaximumLength(200).When(x => x.CustomerId is not null);
    }
}

/// <summary>
/// Handles CreateSaleCommand atomically:
/// 1. Generates sale number
/// 2. Creates Sale aggregate with lines (snapshots prices)
/// 3. Checks stock per line (unless IsOfflineSync)
/// 4. Deducts stock via InventoryItem.ApplyMovement (single source of truth)
/// 5. Creates StockMovement(Sale) per line
/// 6. If offline sync causes negative stock → creates ConflictAlert
/// All steps in one transaction (TransactionBehavior via ITransactionalCommand).
/// </summary>
public class CreateSaleCommandHandler(
    IPharmacyDbContext db,
    ICurrentTenantService tenantService,
    ICurrentUserService userService,
    ISaleNumberService saleNumberService)
    : IRequestHandler<CreateSaleCommand, Result<SaleDto>>
{
    public async Task<Result<SaleDto>> Handle(
        CreateSaleCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;
        var userId = userService.UserId ?? "system";

        // Collect all unique product IDs
        var productIds = request.Lines.Select(l => l.ProductId).Distinct().ToList();

        // Load products (tenant-scoped via global query filter)
        var products = await db.Set<Product>()
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        // Validate all products exist
        var missingProduct = productIds.FirstOrDefault(id => !products.ContainsKey(id));
        if (missingProduct != default)
            return Result<SaleDto>.Failure(
                new NotFoundError("PRODUCT_NOT_FOUND", $"Product {missingProduct} not found."));

        // Load inventory items for all products
        var inventoryItems = await db.Set<InventoryItem>()
            .Where(i => productIds.Contains(i.ProductId))
            .ToDictionaryAsync(i => i.ProductId, cancellationToken);

        // Stock validation — skip for offline sync
        if (!request.IsOfflineSync)
        {
            foreach (var line in request.Lines)
            {
                var currentStock = inventoryItems.TryGetValue(line.ProductId, out var item)
                    ? item.CurrentStock
                    : 0;

                if (currentStock < line.Quantity)
                {
                    var productName = products[line.ProductId].Name;
                    return Result<SaleDto>.Failure(
                        new ConflictError(
                            "INSUFFICIENT_STOCK",
                            $"Insufficient stock for {productName}. Available: {currentStock}, requested: {line.Quantity}."));
                }
            }
        }

        // Generate sale number
        var saleNumber = await saleNumberService.GenerateAsync(tenantId, cancellationToken);

        // Create Sale aggregate
        var sale = new Sale(tenantId, saleNumber, request.CustomerId);

        if (request.IsOfflineSync)
            sale.MarkAsOfflineSync();

        // Add lines with price snapshots
        foreach (var line in request.Lines)
        {
            var product = products[line.ProductId];
            sale.AddLine(line.ProductId, product.Name, line.Quantity, product.UnitPrice);
        }

        sale.Complete();
        db.Set<Sale>().Add(sale);

        // Deduct stock per line — create StockMovements + update InventoryItem + Product
        foreach (var line in request.Lines)
        {
            var product = products[line.ProductId];
            var negativeQty = -line.Quantity;

            // Get or create InventoryItem
            if (!inventoryItems.TryGetValue(line.ProductId, out var inventoryItem))
            {
                inventoryItem = new InventoryItem(tenantId, line.ProductId);
                db.Set<InventoryItem>().Add(inventoryItem);
                inventoryItems[line.ProductId] = inventoryItem;
            }

            inventoryItem.ApplyMovement(negativeQty);
            // Note: Product no longer stores StockQuantity — InventoryItem is the single source of truth.

            var movement = new StockMovement(
                tenantId: tenantId,
                productId: line.ProductId,
                movementType: MovementType.Sale,
                quantity: negativeQty,
                userId: userId,
                reason: $"Sale {saleNumber}");

            db.Set<StockMovement>().Add(movement);

            // If offline sync caused negative stock → create ConflictAlert
            if (request.IsOfflineSync && inventoryItem.CurrentStock < 0)
            {
                var alert = new ConflictAlert(
                    tenantId: tenantId,
                    saleId: sale.Id,
                    productId: line.ProductId,
                    productName: product.Name,
                    expectedStock: inventoryItem.CurrentStock + line.Quantity, // before deduction
                    actualStock: inventoryItem.CurrentStock);

                db.Set<ConflictAlert>().Add(alert);
                sale.AddDomainEvent(new StockConflictDetectedEvent(
                    alert.Id,
                    tenantId,
                    sale.Id,
                    line.ProductId,
                    product.Name,
                    alert.ExpectedStock,
                    alert.ActualStock));
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        return Result<SaleDto>.Success(sale.ToDto());
    }
}
