using FluentValidation;
using MediatR;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Identity;

namespace PharmacySystem.Application.Identity.Commands;

// ─── Command ────────────────────────────────────────────────────────────────

public record LoginCommand(string Email, string Password) : IRequest<Result<AuthResponse>>;

// ─── Validator ──────────────────────────────────────────────────────────────

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.");
    }
}

// ─── Handler ────────────────────────────────────────────────────────────────

public class LoginCommandHandler(
    IUserManagerService userManager,
    ICurrentTenantService tenantService,
    ITokenService tokenService) : IRequestHandler<LoginCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;

        // Fallback: no X-Tenant-Id header was sent — resolve tenant from email.
        if (tenantId == Guid.Empty)
        {
            var tenants = await userManager.FindTenantsByEmailAsync(request.Email, cancellationToken);

            if (tenants.Count == 0)
                return Result<AuthResponse>.Failure(
                    new UnauthorizedError("Auth.InvalidCredentials", "Invalid email or password."));

            if (tenants.Count == 1)
            {
                // Auto-resolve: set tenantId and fall through to normal auth flow.
                tenantService.TenantId = tenants[0].Id;
                tenantId = tenants[0].Id;
            }
            else
            {
                // Multiple tenants — client must pick one.
                var tenantInfos = tenants
                    .Select(t => new TenantInfo(t.Id, t.Name, t.Slug))
                    .ToList()
                    .AsReadOnly();

                return Result<AuthResponse>.Failure(
                    new TenantSelectionRequiredError(
                        "Auth.TenantSelectionRequired",
                        "Multiple tenants found for this email. Please select one.",
                        tenantInfos));
            }
        }

        var user = await userManager.FindByEmailAndTenantAsync(request.Email, tenantId);
        if (user is null)
            return Result<AuthResponse>.Failure(
                new UnauthorizedError("Auth.InvalidCredentials", "Invalid email or password."));

        var isPasswordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid)
            return Result<AuthResponse>.Failure(
                new UnauthorizedError("Auth.InvalidCredentials", "Invalid email or password."));

        var roles = await userManager.GetRolesAsync(user.Id);
        var (accessToken, refreshToken, expiry) = await tokenService.GenerateTokensAsync(user, roles);

        var userDto = user.ToDto(roles.FirstOrDefault() ?? Roles.Clerk);
        return Result<AuthResponse>.Success(new AuthResponse(accessToken, refreshToken, expiry, userDto));
    }
}
