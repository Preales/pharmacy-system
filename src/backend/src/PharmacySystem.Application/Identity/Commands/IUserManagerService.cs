using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;

namespace PharmacySystem.Application.Identity.Commands;

/// <summary>
/// Abstraction over ASP.NET Identity UserManager — lives in Application layer
/// so that handlers don't depend on Infrastructure.
/// </summary>
public interface IUserManagerService
{
    Task<IApplicationUserProjection?> FindByEmailAndTenantAsync(string email, Guid tenantId);
    Task<IApplicationUserProjection?> FindByIdAsync(string userId);
    Task<(IdentityResultWrapper result, string userId)> CreateUserAsync(
        string email, string password, string firstName, string lastName, Guid tenantId, string role);
    Task AddToRoleAsync(string userId, string role);
    Task<bool> CheckPasswordAsync(IApplicationUserProjection user, string password);
    Task<IReadOnlyList<string>> GetRolesAsync(string userId);
    Task<IReadOnlyList<IApplicationUserProjection>> GetUsersByTenantAsync(Guid tenantId);

    /// <summary>
    /// Returns all active tenants that contain a user with the given email address.
    /// Bypasses EF global query filters so the lookup is not scoped to a specific tenant.
    /// Returns an empty list for unknown emails — never throws or returns null.
    /// </summary>
    Task<IReadOnlyList<TenantSummaryDto>> FindTenantsByEmailAsync(string email, CancellationToken ct = default);
}

/// <summary>
/// Thin wrapper around IdentityResult to avoid Infrastructure leak into Application layer.
/// </summary>
public record IdentityResultWrapper(
    bool Succeeded,
    IEnumerable<IdentityErrorWrapper> Errors);

public record IdentityErrorWrapper(string Code, string Description);
