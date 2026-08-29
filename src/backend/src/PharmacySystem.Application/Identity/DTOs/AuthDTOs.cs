namespace PharmacySystem.Application.Identity.DTOs;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(string Email, string Password, string FirstName, string LastName);

public record RegisterTenantRequest(string TenantName, string TenantSlug, string AdminEmail, string AdminPassword, string AdminFirstName, string AdminLastName);

public record RefreshTokenRequest(string RefreshToken);

public record RevokeTokenRequest(string RefreshToken);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiry,
    UserDto User);

public record UserDto(
    string Id,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    string Role,
    Guid TenantId,
    bool IsActive = true);

public record TenantDto(
    Guid Id,
    string Name,
    string Slug,
    bool IsActive);

/// <summary>
/// Minimal tenant projection returned by the tenant-by-email lookup and the
/// TenantSelectionRequired error extension. Contains only the fields needed
/// to identify a tenant for login selection.
/// </summary>
public record TenantSummaryDto(Guid Id, string Name, string Slug);
