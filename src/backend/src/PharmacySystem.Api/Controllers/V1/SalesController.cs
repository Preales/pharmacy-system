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
[Route("api/v{version:apiVersion}/sales")]
[Authorize]
public class SalesController(ISender mediator) : ControllerBase
{
    /// <summary>
    /// Returns a paginated, filterable list of sales for the current tenant.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "CashierPolicy")]
    [ProducesResponseType(typeof(PagedResult<SaleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSales(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] string? status = null,
        [FromQuery] string? customerId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new GetSalesQuery(page, pageSize, dateFrom, dateTo, status, customerId),
            cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Returns full details of a single sale including line items.
    /// </summary>
    [HttpGet("{id:guid}", Name = nameof(GetSaleById))]
    [Authorize(Policy = "CashierPolicy")]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSaleById(Guid id, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetSaleByIdQuery(id), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Creates a new sale and deducts stock atomically.
    /// Supports offline sync (isOfflineSync: true allows negative stock with conflict alert).
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "CashierPolicy")]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateSale(
        [FromBody] CreateSaleCommand command,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(command, cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return CreatedAtRoute(
            nameof(GetSaleById),
            new { id = result.Value!.Id },
            result.Value);
    }

    /// <summary>
    /// Returns the receipt view for a completed sale (same data as GetById, receipt-optimised alias).
    /// </summary>
    [HttpGet("{id:guid}/receipt")]
    [Authorize(Policy = "CashierPolicy")]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReceipt(Guid id, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetSaleByIdQuery(id), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Voids a completed sale and restores stock. Admin only.
    /// </summary>
    [HttpPut("{id:guid}/void")]
    [Authorize(Policy = "AdminPolicy")]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> VoidSale(
        Guid id,
        [FromBody] VoidSaleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new VoidSaleCommand(id, request.Reason),
            cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Returns sales summary (total count, total revenue, average ticket) for a date range.
    /// </summary>
    [HttpGet("summary")]
    [Authorize(Policy = "PharmacistPolicy")]
    [ProducesResponseType(typeof(SaleSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesSummary(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var from = dateFrom ?? DateTime.UtcNow.Date;
        var to = dateTo ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);

        var result = await mediator.Send(new GetSalesSummaryQuery(from, to), cancellationToken);
        return result.ToActionResult();
    }
}

/// <summary>
/// Request body for the void sale endpoint.
/// </summary>
public record VoidSaleRequest(string Reason);
