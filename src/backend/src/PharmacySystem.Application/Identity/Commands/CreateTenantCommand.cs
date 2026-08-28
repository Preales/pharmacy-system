using FluentValidation;
using MediatR;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Identity;

namespace PharmacySystem.Application.Identity.Commands;

// ─── Command ────────────────────────────────────────────────────────────────

public record CreateTenantCommand(
    string TenantName,
    string TenantSlug,
    string AdminEmail,
    string AdminPassword,
    string AdminFirstName,
    string AdminLastName) : IRequest<Result<TenantDto>>;

// ─── Validator ──────────────────────────────────────────────────────────────

public class CreateTenantCommandValidator : AbstractValidator<CreateTenantCommand>
{
    public CreateTenantCommandValidator()
    {
        RuleFor(x => x.TenantName)
            .NotEmpty().WithMessage("Tenant name is required.")
            .MaximumLength(200);

        RuleFor(x => x.TenantSlug)
            .NotEmpty().WithMessage("Tenant slug is required.")
            .Matches("^[a-z0-9-]+$").WithMessage("Slug must be lowercase alphanumeric with hyphens only.")
            .MaximumLength(100);

        RuleFor(x => x.AdminEmail)
            .NotEmpty().WithMessage("Admin email is required.")
            .EmailAddress().WithMessage("Invalid admin email format.");

        RuleFor(x => x.AdminPassword)
            .NotEmpty().WithMessage("Admin password is required.")
            .MinimumLength(8).WithMessage("Admin password must be at least 8 characters.");

        RuleFor(x => x.AdminFirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.AdminLastName).NotEmpty().MaximumLength(100);
    }
}

// ─── Handler ────────────────────────────────────────────────────────────────

public class CreateTenantCommandHandler(
    IPharmacyDbContext dbContext,
    IUserManagerService userManager) : IRequestHandler<CreateTenantCommand, Result<TenantDto>>
{
    public async Task<Result<TenantDto>> Handle(CreateTenantCommand request, CancellationToken cancellationToken)
    {
        // Check slug uniqueness
        var slugExists = dbContext.Set<Tenant>()
            .Any(t => t.Slug == request.TenantSlug.ToLowerInvariant());

        if (slugExists)
            return Result<TenantDto>.Failure(
                new ConflictError("Tenant.SlugExists", $"Tenant slug '{request.TenantSlug}' is already taken."));

        // Create tenant (TenantId generated in entity; we override here since Tenant is its own root)
        var tenant = Tenant.Create(request.TenantName, request.TenantSlug);
        tenant.TenantId = tenant.Id; // self-referencing: Tenant's TenantId = its own Id

        dbContext.Set<Tenant>().Add(tenant);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Provision default admin user
        var (result, userId) = await userManager.CreateUserAsync(
            request.AdminEmail, request.AdminPassword,
            request.AdminFirstName, request.AdminLastName,
            tenant.Id, Roles.Admin);

        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            return Result<TenantDto>.Failure(
                new ValidationError("Tenant.AdminCreationFailed", "Failed to create admin user.", errors));
        }

        await userManager.AddToRoleAsync(userId, Roles.Admin);

        return Result<TenantDto>.Success(tenant.ToDto());
    }
}
