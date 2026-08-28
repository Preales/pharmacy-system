using FluentValidation;
using MediatR;
using PharmacySystem.Domain.Common;

namespace PharmacySystem.Application.Identity.Commands;

// ─── Command ────────────────────────────────────────────────────────────────

public record RevokeTokenCommand(string RefreshToken) : IRequest<Result<bool>>;

// ─── Validator ──────────────────────────────────────────────────────────────

public class RevokeTokenCommandValidator : AbstractValidator<RevokeTokenCommand>
{
    public RevokeTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token is required.");
    }
}

// ─── Handler ────────────────────────────────────────────────────────────────

public class RevokeTokenCommandHandler(
    ITokenService tokenService) : IRequestHandler<RevokeTokenCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(RevokeTokenCommand request, CancellationToken cancellationToken)
    {
        var revoked = await tokenService.RevokeRefreshTokenAsync(request.RefreshToken);
        if (!revoked)
            return Result<bool>.Failure(
                new UnauthorizedError("Auth.InvalidToken", "Token not found or already revoked."));

        return Result<bool>.Success(true);
    }
}
