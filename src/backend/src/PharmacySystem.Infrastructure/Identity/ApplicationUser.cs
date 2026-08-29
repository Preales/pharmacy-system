using Microsoft.AspNetCore.Identity;
using PharmacySystem.Application.Identity.Mappings;

namespace PharmacySystem.Infrastructure.Identity;

/// <summary>
/// EF Core / ASP.NET Identity user entity.
/// Extends IdentityUser with pharmacy-specific fields.
/// Implements IApplicationUserProjection so Application layer handlers can use it without Infrastructure references.
/// </summary>
public class ApplicationUser : IdentityUser, IApplicationUserProjection
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public bool IsActive { get; set; } = true;
}
