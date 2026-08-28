using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Api.Extensions;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Sales.Commands;
using PharmacySystem.Application.Sales.DTOs;
using PharmacySystem.Application.Sales.Queries;

namespace PharmacySystem.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/conflict-alerts")]
[Authorize]
public class ConflictAlertsController(ISender mediator) : ControllerBase
{
    /// <summary>
    /// Returns a paginated list of stock conflict alerts for the current tenant.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "PharmacistPolicy")]
    [ProducesResponseType(typeof(PagedResult<ConflictAlertDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConflictAlerts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? isResolved = null,
        CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new GetConflictAlertsQuery(page, pageSize, isResolved),
            cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Resolves an open stock conflict alert. Admin only.
    /// </summary>
    [HttpPut("{id:guid}/resolve")]
    [Authorize(Policy = "AdminPolicy")]
    [ProducesResponseType(typeof(ConflictAlertDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ResolveAlert(Guid id, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new ResolveConflictAlertCommand(id),
            cancellationToken);

        return result.ToActionResult();
    }
}
