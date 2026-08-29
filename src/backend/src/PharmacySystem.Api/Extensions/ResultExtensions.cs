using Microsoft.AspNetCore.Mvc;
using PharmacySystem.Domain.Common;

namespace PharmacySystem.Api.Extensions;

public static class ResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
            return new OkObjectResult(result.Value);

        return result.Error switch
        {
            ValidationError validation => new BadRequestObjectResult(new ProblemDetails
            {
                Type = "https://tools.ietf.org/html/rfc7807",
                Title = "Validation Error",
                Status = StatusCodes.Status400BadRequest,
                Detail = validation.Message,
                Extensions =
                {
                    ["errors"] = validation.Errors
                }
            }),
            NotFoundError notFound => new NotFoundObjectResult(new ProblemDetails
            {
                Type = "https://tools.ietf.org/html/rfc7807",
                Title = "Not Found",
                Status = StatusCodes.Status404NotFound,
                Detail = notFound.Message
            }),
            ConflictError conflict => new ConflictObjectResult(new ProblemDetails
            {
                Type = "https://tools.ietf.org/html/rfc7807",
                Title = "Conflict",
                Status = StatusCodes.Status409Conflict,
                Detail = conflict.Message
            }),
            UnauthorizedError => new UnauthorizedResult(),
            BusinessRuleError businessRule =>
                new ObjectResult(new ProblemDetails
                {
                    Type = "https://tools.ietf.org/html/rfc7807",
                    Title = "Business Rule Violation",
                    Status = StatusCodes.Status422UnprocessableEntity,
                    Detail = businessRule.Message
                })
                { StatusCode = StatusCodes.Status422UnprocessableEntity },
            TenantSelectionRequiredError tenantSelection =>
                new ObjectResult(new ProblemDetails
                {
                    Type = "https://tools.ietf.org/html/rfc7807",
                    Title = "Tenant Selection Required",
                    Status = StatusCodes.Status422UnprocessableEntity,
                    Detail = tenantSelection.Message,
                    Extensions = { ["tenants"] = tenantSelection.Tenants }
                })
                { StatusCode = StatusCodes.Status422UnprocessableEntity },
            _ => new ObjectResult(new ProblemDetails
            {
                Type = "https://tools.ietf.org/html/rfc7807",
                Title = "Error",
                Status = StatusCodes.Status500InternalServerError,
                Detail = result.Error?.Message ?? "An unexpected error occurred."
            })
            { StatusCode = StatusCodes.Status500InternalServerError }
        };
    }

    public static IActionResult ToCreatedResult<T>(
        this Result<T> result,
        string routeName,
        Func<T, object> routeValues)
    {
        if (result.IsFailure)
            return result.ToActionResult();

        return new CreatedAtRouteResult(routeName, routeValues(result.Value!), result.Value);
    }
}
