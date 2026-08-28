using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Sales.DTOs;
using PharmacySystem.Application.Sales.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Sales;

namespace PharmacySystem.Application.Sales.Commands;

// ─── Resolve Conflict Alert Command ──────────────────────────────────────────

public record ResolveConflictAlertCommand(
    Guid AlertId) : IRequest<Result<ConflictAlertDto>>;

public class ResolveConflictAlertCommandValidator : AbstractValidator<ResolveConflictAlertCommand>
{
    public ResolveConflictAlertCommandValidator()
    {
        RuleFor(x => x.AlertId).NotEmpty();
    }
}

public class ResolveConflictAlertCommandHandler(
    IPharmacyDbContext db,
    ICurrentUserService userService)
    : IRequestHandler<ResolveConflictAlertCommand, Result<ConflictAlertDto>>
{
    public async Task<Result<ConflictAlertDto>> Handle(
        ResolveConflictAlertCommand request,
        CancellationToken cancellationToken)
    {
        var userId = userService.UserId ?? "system";

        var alert = await db.Set<ConflictAlert>()
            .FirstOrDefaultAsync(a => a.Id == request.AlertId, cancellationToken);

        if (alert is null)
            return Result<ConflictAlertDto>.Failure(
                new NotFoundError("ALERT_NOT_FOUND", $"Conflict alert {request.AlertId} not found."));

        if (alert.IsResolved)
            return Result<ConflictAlertDto>.Failure(
                new ConflictError("ALERT_ALREADY_RESOLVED", "This conflict alert has already been resolved."));

        alert.Resolve(userId);

        // Load the sale number for the DTO
        var sale = await db.Set<Sale>()
            .FirstOrDefaultAsync(s => s.Id == alert.SaleId, cancellationToken);

        var saleNumber = sale?.SaleNumber ?? alert.SaleId.ToString();

        await db.SaveChangesAsync(cancellationToken);

        return Result<ConflictAlertDto>.Success(alert.ToDto(saleNumber));
    }
}
