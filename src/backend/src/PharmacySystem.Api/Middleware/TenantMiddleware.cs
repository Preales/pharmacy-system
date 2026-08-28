using PharmacySystem.Domain.Common.Interfaces;

namespace PharmacySystem.Api.Middleware;

public class TenantMiddleware(RequestDelegate next)
{
    private const string TenantHeader = "X-Tenant-Id";
    private readonly RequestDelegate _next = next;

    private static readonly HashSet<string> ExemptPaths =
    [
        "/health",
        "/swagger"
    ];

    public async Task InvokeAsync(HttpContext context, ICurrentTenantService tenantService)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        if (ExemptPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        if (context.Request.Headers.TryGetValue(TenantHeader, out var tenantIdHeader)
            && Guid.TryParse(tenantIdHeader, out var tenantId))
        {
            tenantService.TenantId = tenantId;
        }

        await _next(context);
    }
}
