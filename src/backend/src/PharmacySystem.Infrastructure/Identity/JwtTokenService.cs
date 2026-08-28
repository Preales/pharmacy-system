using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Identity;
using PharmacySystem.Infrastructure.Persistence;

namespace PharmacySystem.Infrastructure.Identity;

public class JwtTokenService(
    PharmacyDbContext dbContext,
    IConfiguration configuration) : ITokenService
{
    private readonly string _secret = configuration["Jwt:Secret"]
        ?? throw new InvalidOperationException("JWT Secret is not configured.");
    private readonly string _issuer = configuration["Jwt:Issuer"] ?? "PharmacySystem";
    private readonly string _audience = configuration["Jwt:Audience"] ?? "PharmacySystem";
    private readonly int _expirationMinutes = int.Parse(configuration["Jwt:ExpirationInMinutes"] ?? "60");
    private readonly int _refreshDays = int.Parse(configuration["Jwt:RefreshTokenExpirationInDays"] ?? "7");

    public async Task<(string AccessToken, string RefreshToken, DateTime AccessTokenExpiry)> GenerateTokensAsync(
        IApplicationUserProjection user,
        IEnumerable<string> roles)
    {
        var expiry = DateTime.UtcNow.AddMinutes(_expirationMinutes);
        var accessToken = GenerateAccessToken(user, roles, expiry);
        var refreshToken = await CreateAndPersistRefreshTokenAsync(user);

        return (accessToken, refreshToken, expiry);
    }

    public async Task<string?> GetUserIdFromRefreshTokenAsync(string refreshToken)
    {
        var token = await dbContext.Set<RefreshToken>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (token is null || !token.IsActive)
            return null;

        return token.UserId;
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken)
    {
        var token = await dbContext.Set<RefreshToken>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (token is null || !token.IsActive)
            return false;

        token.Revoke();
        await dbContext.SaveChangesAsync();
        return true;
    }

    // ─── Private helpers ──────────────────────────────────────────────────

    private string GenerateAccessToken(
        IApplicationUserProjection user,
        IEnumerable<string> roles,
        DateTime expiry)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new("tenantId", user.TenantId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.GivenName, user.FirstName),
            new(ClaimTypes.Surname, user.LastName),
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: expiry,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> CreateAndPersistRefreshTokenAsync(IApplicationUserProjection user)
    {
        var tokenValue = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var expiresAt = DateTime.UtcNow.AddDays(_refreshDays);

        var refreshToken = RefreshToken.Create(tokenValue, user.Id, user.TenantId, expiresAt);
        dbContext.Set<RefreshToken>().Add(refreshToken);
        await dbContext.SaveChangesAsync();

        return tokenValue;
    }
}
