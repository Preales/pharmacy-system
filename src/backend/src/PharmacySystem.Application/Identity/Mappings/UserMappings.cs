using PharmacySystem.Application.Identity.DTOs;

namespace PharmacySystem.Application.Identity.Mappings;

/// <summary>
/// Interface representing the user projection needed for DTO mapping.
/// Infrastructure layer's ApplicationUser implements this contract.
/// </summary>
public interface IApplicationUserProjection
{
    string Id { get; }
    string? Email { get; }
    string FirstName { get; }
    string LastName { get; }
    Guid TenantId { get; }
    bool IsActive { get; }
}

public static class UserMappings
{
    /// <summary>
    /// Maps a user projection to a UserDto.
    /// </summary>
    public static UserDto ToDto(this IApplicationUserProjection user, string role) =>
        new(
            Id: user.Id,
            Email: user.Email ?? string.Empty,
            FirstName: user.FirstName,
            LastName: user.LastName,
            FullName: $"{user.FirstName} {user.LastName}",
            Role: role,
            TenantId: user.TenantId,
            IsActive: user.IsActive);
}
