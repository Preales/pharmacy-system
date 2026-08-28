using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PharmacySystem.Domain.Common.Interfaces;

namespace PharmacySystem.Infrastructure.Services;

/// <summary>
/// Resolves the current tenant from:
/// 1. JWT "tenantId" claim (set after successful authentication)
/// 2. X-Tenant-Id header (set by TenantMiddleware for unauthenticated flows like register/login)
/// The TenantId property is also writable so TenantMiddleware can seed it directly.
/// </summary>
public class CurrentTenantService(IHttpContextAccessor httpContextAccessor) : ICurrentTenantService
{
    private Guid? _tenantId;

    public Guid TenantId
    {
        get
        {
            if (_tenantId.HasValue)
                return _tenantId.Value;

            // Attempt to resolve from JWT claim
            var claim = httpContextAccessor.HttpContext?.User.FindFirstValue("tenantId");
            if (claim is not null && Guid.TryParse(claim, out var fromJwt))
            {
                _tenantId = fromJwt;
                return fromJwt;
            }

            return _tenantId ?? Guid.Empty;
        }
        set => _tenantId = value;
    }
}
