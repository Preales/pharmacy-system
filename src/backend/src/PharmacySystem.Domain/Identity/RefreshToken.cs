using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Identity;

public class RefreshToken : Entity
{
    public string Token { get; private set; } = string.Empty;
    public string UserId { get; private set; } = string.Empty;
    public DateTime ExpiresAt { get; private set; }
    public bool IsRevoked { get; private set; }
    public string? ReplacedByToken { get; private set; }

    private RefreshToken() { }

    public static RefreshToken Create(string token, string userId, Guid tenantId, DateTime expiresAt)
    {
        return new RefreshToken
        {
            Token = token,
            UserId = userId,
            TenantId = tenantId,
            ExpiresAt = expiresAt
        };
    }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsActive => !IsRevoked && !IsExpired;

    public void Revoke(string? replacedByToken = null)
    {
        IsRevoked = true;
        ReplacedByToken = replacedByToken;
    }
}
