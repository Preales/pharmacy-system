using Microsoft.AspNetCore.Identity;

namespace PharmacySystem.Infrastructure.Identity;

/// <summary>
/// Application role entity. Extends IdentityRole — reserved for future role extensions.
/// </summary>
public class ApplicationRole : IdentityRole
{
    public ApplicationRole() : base() { }
    public ApplicationRole(string roleName) : base(roleName) { }
}
