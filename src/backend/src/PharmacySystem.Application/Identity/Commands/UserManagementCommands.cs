using FluentValidation;
using MediatR;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Domain.Identity;

namespace PharmacySystem.Application.Identity.Commands;

// ─── Create User ─────────────────────────────────────────────────────────────

public record CreateUserCommand(
    string Email,
    string FirstName,
    string LastName,
    string Role,
    string Password) : IRequest<Result<UserDto>>;

public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => Roles.All.Contains(r))
            .WithMessage($"Role must be one of: {string.Join(", ", Roles.All)}.");
    }
}

public class CreateUserCommandHandler(
    IUserManagerService userManager,
    ICurrentTenantService tenantService)
    : IRequestHandler<CreateUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(
        CreateUserCommand request,
        CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;

        var existing = await userManager.FindByEmailAndTenantAsync(request.Email, tenantId);
        if (existing is not null)
            return Result<UserDto>.Failure(
                new ConflictError("USER_EMAIL_EXISTS", $"A user with email '{request.Email}' already exists in this tenant."));

        var (result, userId) = await userManager.CreateUserAsync(
            request.Email, request.Password, request.FirstName, request.LastName, tenantId, request.Role);

        if (!result.Succeeded)
        {
            var errors = result.Errors
                .ToDictionary(e => e.Code, e => new[] { e.Description });
            return Result<UserDto>.Failure(
                new ValidationError("USER_CREATE_FAILED", "Failed to create user.", errors));
        }

        await userManager.AddToRoleAsync(userId, request.Role);

        var user = await userManager.FindByIdAsync(userId);
        return Result<UserDto>.Success(user!.ToDto(request.Role));
    }
}

// ─── Update User ─────────────────────────────────────────────────────────────

public record UpdateUserCommand(
    string UserId,
    string FirstName,
    string LastName) : IRequest<Result<UserDto>>;

public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
    }
}

public class UpdateUserCommandHandler(IUserManagerService userManager)
    : IRequestHandler<UpdateUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(
        UpdateUserCommand request,
        CancellationToken cancellationToken)
    {
        var existing = await userManager.FindByIdAsync(request.UserId);
        if (existing is null)
            return Result<UserDto>.Failure(
                new NotFoundError("USER_NOT_FOUND", $"User {request.UserId} not found."));

        var (result, _) = await userManager.UpdateUserAsync(request.UserId, request.FirstName, request.LastName);

        if (!result.Succeeded)
        {
            var errors = result.Errors
                .ToDictionary(e => e.Code, e => new[] { e.Description });
            return Result<UserDto>.Failure(
                new ValidationError("USER_UPDATE_FAILED", "Failed to update user.", errors));
        }

        var updated = await userManager.FindByIdAsync(request.UserId);
        var roles = await userManager.GetRolesAsync(request.UserId);
        return Result<UserDto>.Success(updated!.ToDto(roles.FirstOrDefault() ?? string.Empty));
    }
}

// ─── Deactivate User ─────────────────────────────────────────────────────────

public record DeactivateUserCommand(string UserId) : IRequest<Result<bool>>;

public class DeactivateUserCommandValidator : AbstractValidator<DeactivateUserCommand>
{
    public DeactivateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public class DeactivateUserCommandHandler(IUserManagerService userManager)
    : IRequestHandler<DeactivateUserCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        DeactivateUserCommand request,
        CancellationToken cancellationToken)
    {
        var existing = await userManager.FindByIdAsync(request.UserId);
        if (existing is null)
            return Result<bool>.Failure(
                new NotFoundError("USER_NOT_FOUND", $"User {request.UserId} not found."));

        var result = await userManager.DeactivateUserAsync(request.UserId);

        if (!result.Succeeded)
        {
            var errors = result.Errors
                .ToDictionary(e => e.Code, e => new[] { e.Description });
            return Result<bool>.Failure(
                new ValidationError("USER_DEACTIVATE_FAILED", "Failed to deactivate user.", errors));
        }

        return Result<bool>.Success(true);
    }
}

// ─── Change User Role ─────────────────────────────────────────────────────────

public record ChangeUserRoleCommand(string UserId, string NewRole) : IRequest<Result<UserDto>>;

public class ChangeUserRoleCommandValidator : AbstractValidator<ChangeUserRoleCommand>
{
    public ChangeUserRoleCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.NewRole)
            .NotEmpty()
            .Must(r => Roles.All.Contains(r))
            .WithMessage($"Role must be one of: {string.Join(", ", Roles.All)}.");
    }
}

public class ChangeUserRoleCommandHandler(
    IUserManagerService userManager,
    ICurrentTenantService tenantService)
    : IRequestHandler<ChangeUserRoleCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(
        ChangeUserRoleCommand request,
        CancellationToken cancellationToken)
    {
        var existing = await userManager.FindByIdAsync(request.UserId);
        if (existing is null)
            return Result<UserDto>.Failure(
                new NotFoundError("USER_NOT_FOUND", $"User {request.UserId} not found."));

        // Last-Admin guard: prevent removing the last Admin from the tenant
        var currentRoles = await userManager.GetRolesAsync(request.UserId);
        bool isCurrentlyAdmin = currentRoles.Contains(Roles.Admin);
        bool isDowngradingAdmin = isCurrentlyAdmin && request.NewRole != Roles.Admin;

        if (isDowngradingAdmin)
        {
            var tenantId = tenantService.TenantId;
            var adminCount = await userManager.CountAdminsInTenantAsync(tenantId, cancellationToken);
            if (adminCount <= 1)
                return Result<UserDto>.Failure(
                    new BusinessRuleError(
                        "LAST_ADMIN_GUARD",
                        "Cannot remove the last Admin from a tenant."));
        }

        var result = await userManager.ChangeUserRoleAsync(request.UserId, request.NewRole);

        if (!result.Succeeded)
        {
            var errors = result.Errors
                .ToDictionary(e => e.Code, e => new[] { e.Description });
            return Result<UserDto>.Failure(
                new ValidationError("ROLE_CHANGE_FAILED", "Failed to change user role.", errors));
        }

        var updated = await userManager.FindByIdAsync(request.UserId);
        return Result<UserDto>.Success(updated!.ToDto(request.NewRole));
    }
}
