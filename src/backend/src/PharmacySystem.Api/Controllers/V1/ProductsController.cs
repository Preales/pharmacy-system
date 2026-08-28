using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Api.Extensions;
using PharmacySystem.Application.Catalog.Commands;
using PharmacySystem.Application.Catalog.DTOs;
using PharmacySystem.Application.Catalog.Queries;

namespace PharmacySystem.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/products")]
[Authorize]
public class ProductsController(ISender mediator) : ControllerBase
{
    /// <summary>
    /// Returns a paginated, filterable list of products for the current tenant.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ProductDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? supplierId,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetProductsQuery(search, categoryId, supplierId, isActive, page, pageSize);
        var result = await mediator.Send(query, cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Returns a single product by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetProductByIdQuery(id), cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Creates a new product with SKU validation.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "PharmacistPolicy")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateProductCommand command,
        CancellationToken cancellationToken)
    {
        var result = await mediator.Send(command, cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Updates an existing product (SKU is immutable after creation).
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "PharmacistPolicy")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateProductCommand(
            id, request.Name, request.Description,
            request.UnitPrice, request.CostPrice, request.Unit,
            request.Barcode, request.CategoryId, request.SupplierId);

        var result = await mediator.Send(command, cancellationToken);
        return result.ToActionResult();
    }

    /// <summary>
    /// Soft-deletes a product. Related inventory records remain intact.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "PharmacistPolicy")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new DeleteProductCommand(id), cancellationToken);

        if (result.IsFailure)
            return result.ToActionResult();

        return NoContent();
    }
}

public record UpdateProductRequest(
    string Name,
    string? Description,
    decimal UnitPrice,
    decimal CostPrice,
    string Unit,
    string? Barcode,
    Guid CategoryId,
    Guid? SupplierId);
