using FluentValidation;
using MediatR;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Identity;

namespace PharmacySystem.Application.Identity.Commands;

// ─── Command ────────────────────────────────────────────────────────────────

public record RegisterCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName) : IRequest<Result<AuthResponse>>;

// ─── Validator ──────────────────────────────────────────────────────────────

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(6).WithMessage("Password must be at least 6 characters.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100);
    }
}

// ─── Handler ────────────────────────────────────────────────────────────────

public class RegisterCommandHandler(
    IUserManagerService userManager,
    ICurrentTenantService tenantService,
    ITokenService tokenService) : IRequestHandler<RegisterCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(RegisterCommand request, CancellationToken cancellationToken)
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
                // Auto-resolve: set tenantId and fall through to normal registration flow.
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

        // Tenant-scoped email uniqueness check
        var existingUser = await userManager.FindByEmailAndTenantAsync(request.Email, tenantId);
        if (existingUser is not null)
            return Result<AuthResponse>.Failure(
                new ConflictError("User.EmailExists", $"Email '{request.Email}' is already registered in this tenant."));

        var (result, userId) = await userManager.CreateUserAsync(
            request.Email, request.Password, request.FirstName, request.LastName, tenantId, Roles.Clerk);

        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            return Result<AuthResponse>.Failure(
                new ValidationError("User.CreationFailed", "User registration failed.", errors));
        }

        await userManager.AddToRoleAsync(userId, Roles.Clerk);

        var user = await userManager.FindByIdAsync(userId);
        var (accessToken, refreshToken, expiry) = await tokenService.GenerateTokensAsync(user!, [Roles.Clerk]);

        var userDto = user!.ToDto(Roles.Clerk);
        return Result<AuthResponse>.Success(new AuthResponse(accessToken, refreshToken, expiry, userDto));
    }
}
