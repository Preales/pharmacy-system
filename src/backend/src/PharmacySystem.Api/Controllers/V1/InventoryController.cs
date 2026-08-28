using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Api.Extensions;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Inventory.Commands;
using PharmacySystem.Application.Inventory.DTOs;
using PharmacySystem.Application.Inventory.Queries;

namespace PharmacySystem.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/inventory")]
[Authorize]
public class InventoryController(ISender mediator) : ControllerBase
{
    /// <summary>
    /// Returns current stock level for a specific product.
    /// </summary>
    [HttpGet("{productId:guid}")]
    [ProducesResponseType(typeof(InventoryItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByProduct(Guid productId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetInventoryItemQuery(productId), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Returns all products with stock at or below their configured low-stock threshold.
    /// </summary>
    [HttpGet("low-stock")]
    [ProducesResponseType(typeof(PagedResult<InventoryItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLowStock(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(new GetLowStockItemsQuery(page, pageSize), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Returns the chronological movement history for a specific product.
    /// </summary>
    [HttpGet("{productId:guid}/movements")]
    [ProducesResponseType(typeof(PagedResult<StockMovementDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMovements(
        Guid productId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new GetMovementHistoryQuery(productId, page, pageSize), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Records a stock ingress (supplier delivery). Pharmacist or Admin only.
    /// </summary>
    [HttpPost("ingress")]
    [Authorize(Policy = "PharmacistPolicy")]
    [ProducesResponseType(typeof(StockMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RecordIngress(
        [FromBody] RecordIngressCommand command,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(command, cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return CreatedAtAction(
            nameof(GetByProduct),
            new { productId = result.Value!.ProductId },
            result.Value);
    }

    /// <summary>
    /// Records a manual stock adjustment (damage, expiry, count correction). Pharmacist or Admin only.
    /// </summary>
    [HttpPost("adjustment")]
    [Authorize(Policy = "PharmacistPolicy")]
    [ProducesResponseType(typeof(StockMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateAdjustment(
        [FromBody] CreateAdjustmentCommand command,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(command, cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return CreatedAtAction(
            nameof(GetByProduct),
            new { productId = result.Value!.ProductId },
            result.Value);
    }
}
