using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Api.Extensions;
using PharmacySystem.Application.Reports.DTOs;
using PharmacySystem.Application.Reports.Queries;

namespace PharmacySystem.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/reports")]
[Authorize(Policy = "PharmacistPolicy")]
public class ReportsController(ISender mediator) : ControllerBase
{
    /// <summary>
    /// Returns the dashboard report: today/this-month totals, top products, low-stock and alert counts.
    /// </summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetDashboardReportQuery(), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Returns a daily sales breakdown for the given date range.
    /// </summary>
    [HttpGet("sales")]
    [ProducesResponseType(typeof(SalesReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesReport(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var from = dateFrom?.Date ?? DateTime.UtcNow.Date.AddDays(-30);
        var to = dateTo?.Date ?? DateTime.UtcNow.Date;

        var result = await mediator.Send(new GetSalesReportQuery(from, to), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Returns inventory report: total products, stock value, low-stock and zero-stock lists.
    /// </summary>
    [HttpGet("inventory")]
    [ProducesResponseType(typeof(InventoryReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInventoryReport(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetInventoryReportQuery(), cancellationToken);
        return result.ToActionResult();
    }
}
