using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Api.Extensions;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Queries;

namespace PharmacySystem.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/users")]
[Authorize]
public class UsersController(ISender mediator) : ControllerBase
{
    /// <summary>
    /// Returns all users within the current tenant (Admin only).
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "AdminPolicy")]
    [ProducesResponseType(typeof(IReadOnlyList<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetUsersQuery(), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Returns the currently authenticated user's profile.
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetCurrentUserQuery(), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Creates a new user in the current tenant (Admin only).
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AdminPolicy")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateUser(
        [FromBody] CreateUserCommand command,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(command, cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return CreatedAtAction(nameof(GetUsers), null, result.Value);
    }

    /// <summary>
    /// Updates a user's name (Admin only). Email is not editable.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminPolicy")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateUser(
        string id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateUserCommand(id, request.FirstName, request.LastName);
        var result = await mediator.Send(command, cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Soft-deactivates a user (sets IsActive = false). Admin only. Record is not deleted.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminPolicy")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeactivateUser(string id, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new DeactivateUserCommand(id), cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return NoContent();
    }

    /// <summary>
    /// Changes a user's role (Admin only). Guards against removing the last Admin.
    /// </summary>
    [HttpPut("{id}/role")]
    [Authorize(Policy = "AdminPolicy")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ChangeUserRole(
        string id,
        [FromBody] ChangeUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var command = new ChangeUserRoleCommand(id, request.NewRole);
        var result = await mediator.Send(command, cancellationToken);
        return result.ToActionResult();
    }
}

// Request body records (separate from commands to allow route binding of ID)
public record UpdateUserRequest(string FirstName, string LastName);
public record ChangeUserRoleRequest(string NewRole);
