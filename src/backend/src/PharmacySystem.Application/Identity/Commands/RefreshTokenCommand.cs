using FluentValidation;
using MediatR;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Identity;

namespace PharmacySystem.Application.Identity.Commands;

// ─── Command ────────────────────────────────────────────────────────────────

public record RefreshTokenCommand(string RefreshToken) : IRequest<Result<AuthResponse>>;

// ─── Validator ──────────────────────────────────────────────────────────────

public class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token is required.");
    }
}

// ─── Handler ────────────────────────────────────────────────────────────────

public class RefreshTokenCommandHandler(
    IUserManagerService userManager,
    ITokenService tokenService) : IRequestHandler<RefreshTokenCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        // Validate the incoming refresh token
        var userId = await tokenService.GetUserIdFromRefreshTokenAsync(request.RefreshToken);
        if (userId is null)
            return Result<AuthResponse>.Failure(
                new UnauthorizedError("Auth.InvalidToken", "Invalid or expired refresh token."));

        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
            return Result<AuthResponse>.Failure(
                new UnauthorizedError("Auth.InvalidToken", "Invalid or expired refresh token."));

        // Rotate: revoke old token, issue new pair
        await tokenService.RevokeRefreshTokenAsync(request.RefreshToken);
        var roles = await userManager.GetRolesAsync(user.Id);
        var (accessToken, newRefreshToken, expiry) = await tokenService.GenerateTokensAsync(user, roles);

        var userDto = user.ToDto(roles.FirstOrDefault() ?? Roles.Clerk);
        return Result<AuthResponse>.Success(new AuthResponse(accessToken, newRefreshToken, expiry, userDto));
    }
}
