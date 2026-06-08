using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PharmacySystem.Api.Extensions;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Queries;

namespace PharmacySystem.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
public class AuthController(ISender mediator) : ControllerBase
{
    /// <summary>
    /// Creates a new tenant and provisions a default admin user.
    /// </summary>
    [HttpPost("register-tenant")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TenantDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegisterTenant(
        [FromBody] RegisterTenantRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateTenantCommand(
            request.TenantName, request.TenantSlug,
            request.AdminEmail, request.AdminPassword,
            request.AdminFirstName, request.AdminLastName);

        var result = await mediator.Send(command, cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return CreatedAtAction(nameof(RegisterTenant), new { }, result.Value);
    }

    /// <summary>
    /// Registers a new user within the current tenant context.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var command = new RegisterCommand(
            request.Email, request.Password, request.FirstName, request.LastName);

        var result = await mediator.Send(command, cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return CreatedAtAction(nameof(Register), new { }, result.Value);
    }

    /// <summary>
    /// Authenticates a user and returns a JWT access token + refresh token.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new LoginCommand(request.Email, request.Password), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Rotates a refresh token — issues a new access + refresh token pair, invalidates the old one.
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new RefreshTokenCommand(request.RefreshToken), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Revokes a refresh token (logout / explicit revocation).
    /// </summary>
    [HttpPost("revoke")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Revoke(
        [FromBody] RevokeTokenRequest request,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new RevokeTokenCommand(request.RefreshToken), cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return NoContent();
    }

    /// <summary>
    /// Returns all active tenants that contain the given email address.
    /// Used by the frontend two-step login to resolve tenant context before authentication.
    /// Returns an empty array for unknown emails — never returns 404.
    /// </summary>
    [HttpGet("/api/v{version:apiVersion}/tenants/by-email")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(TenantSummaryDto[]), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetTenantsByEmail(
        [FromQuery] string email,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetTenantsByEmailQuery(email), cancellationToken);
        return result.ToActionResult();
    }
}
