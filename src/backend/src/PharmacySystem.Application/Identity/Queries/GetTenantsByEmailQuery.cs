using FluentValidation;
using MediatR;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Domain.Common;

namespace PharmacySystem.Application.Identity.Queries;

// ─── Query ──────────────────────────────────────────────────────────────────

public record GetTenantsByEmailQuery(string Email)
    : IRequest<Result<IReadOnlyList<TenantSummaryDto>>>;

// ─── Validator ──────────────────────────────────────────────────────────────

public class GetTenantsByEmailQueryValidator : AbstractValidator<GetTenantsByEmailQuery>
{
    public GetTenantsByEmailQueryValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");
    }
}

// ─── Handler ────────────────────────────────────────────────────────────────

public class GetTenantsByEmailQueryHandler(IUserManagerService userManager)
    : IRequestHandler<GetTenantsByEmailQuery, Result<IReadOnlyList<TenantSummaryDto>>>
{
    public async Task<Result<IReadOnlyList<TenantSummaryDto>>> Handle(
        GetTenantsByEmailQuery request, CancellationToken cancellationToken)
    {
        var tenants = await userManager.FindTenantsByEmailAsync(request.Email, cancellationToken);
        return Result<IReadOnlyList<TenantSummaryDto>>.Success(tenants);
    }
}
