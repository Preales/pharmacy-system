using PharmacySystem.Application.Identity.Mappings;

namespace PharmacySystem.Application.Identity.Commands;

/// <summary>
/// Abstraction over JWT generation and refresh token lifecycle.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Generates a new access token + refresh token pair, persisting the refresh token.
    /// </summary>
    Task<(string AccessToken, string RefreshToken, DateTime AccessTokenExpiry)> GenerateTokensAsync(
        IApplicationUserProjection user,
        IEnumerable<string> roles);

    /// <summary>
    /// Validates a refresh token and returns the associated UserId, or null if invalid/expired.
    /// </summary>
    Task<string?> GetUserIdFromRefreshTokenAsync(string refreshToken);

    /// <summary>
    /// Revokes a refresh token. Returns false if the token was not found.
    /// </summary>
    Task<bool> RevokeRefreshTokenAsync(string refreshToken);
}
