using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Domain.Identity;

namespace PharmacySystem.Application.Identity.Mappings;

public static class TenantMappings
{
    /// <summary>
    /// Maps a Tenant domain entity to a TenantDto.
    /// </summary>
    public static TenantDto ToDto(this Tenant tenant) =>
        new(
            Id: tenant.Id,
            Name: tenant.Name,
            Slug: tenant.Slug,
            IsActive: tenant.IsActive);
}
