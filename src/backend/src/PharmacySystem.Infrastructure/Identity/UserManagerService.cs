using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Infrastructure.Persistence;

namespace PharmacySystem.Infrastructure.Identity;

public class UserManagerService(
    UserManager<ApplicationUser> userManager,
    RoleManager<ApplicationRole> roleManager,
    PharmacyDbContext dbContext) : IUserManagerService
{
    public async Task<IApplicationUserProjection?> FindByEmailAndTenantAsync(string email, Guid tenantId)
    {
        // Email uniqueness is per-tenant — must query by both email AND tenantId
        return await userManager.Users
            .FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);
    }

    public async Task<IApplicationUserProjection?> FindByIdAsync(string userId)
    {
        return await userManager.FindByIdAsync(userId);
    }

    public async Task<(IdentityResultWrapper result, string userId)> CreateUserAsync(
        string email, string password, string firstName, string lastName, Guid tenantId, string role)
    {
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            TenantId = tenantId
        };

        var result = await userManager.CreateAsync(user, password);
        var wrapped = WrapResult(result);
        return (wrapped, user.Id);
    }

    public async Task AddToRoleAsync(string userId, string role)
    {
        // Ensure role exists
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new ApplicationRole(role));

        var user = await userManager.FindByIdAsync(userId);
        if (user is not null)
            await userManager.AddToRoleAsync(user, role);
    }

    public async Task<bool> CheckPasswordAsync(IApplicationUserProjection user, string password)
    {
        var appUser = await userManager.FindByIdAsync(user.Id);
        if (appUser is null) return false;
        return await userManager.CheckPasswordAsync(appUser, password);
    }

    public async Task<IReadOnlyList<string>> GetRolesAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return [];
        var roles = await userManager.GetRolesAsync(user);
        return roles.AsReadOnly();
    }

    public async Task<IReadOnlyList<IApplicationUserProjection>> GetUsersByTenantAsync(Guid tenantId)
    {
        var users = await userManager.Users
            .Where(u => u.TenantId == tenantId)
            .ToListAsync();

        return users.Cast<IApplicationUserProjection>().ToList().AsReadOnly();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<TenantSummaryDto>> FindTenantsByEmailAsync(
        string email, CancellationToken ct = default)
    {
        // Must call IgnoreQueryFilters() — at login time tenantService.TenantId == Guid.Empty,
        // so the global filter would exclude every row otherwise.
        var tenantIds = await userManager.Users
            .IgnoreQueryFilters()
            .Where(u => u.Email == email && u.TenantId != Guid.Empty)
            .Select(u => u.TenantId)
            .Distinct()
            .ToListAsync(ct);

        if (tenantIds.Count == 0)
            return [];

        // Also bypass tenant/soft-delete filter on Tenants; manually enforce IsActive && !IsDeleted.
        var tenants = await dbContext.Tenants
            .IgnoreQueryFilters()
            .Where(t => tenantIds.Contains(t.Id) && t.IsActive && !t.IsDeleted)
            .Select(t => new TenantSummaryDto(t.Id, t.Name, t.Slug))
            .ToListAsync(ct);

        return tenants.AsReadOnly();
    }

    private static IdentityResultWrapper WrapResult(IdentityResult result) =>
        new(result.Succeeded,
            result.Errors.Select(e => new IdentityErrorWrapper(e.Code, e.Description)));
}
