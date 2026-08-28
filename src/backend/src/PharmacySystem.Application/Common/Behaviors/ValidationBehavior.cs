using FluentValidation;
using MediatR;
using Microsoft.Extensions.Localization;
using PharmacySystem.Application.Common.Resources;
using PharmacySystem.Domain.Common;

namespace PharmacySystem.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior that runs FluentValidation validators before the handler.
/// Returns a ValidationError Result if any validators fail.
/// Validation error messages are localised via IStringLocalizer&lt;ValidationMessages&gt;
/// using the culture resolved by RequestLocalizationMiddleware (Accept-Language header).
/// </summary>
public class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators,
    IStringLocalizer<ValidationMessages> localizer)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!validators.Any())
            return await next(cancellationToken);

        var context = new ValidationContext<TRequest>(request);

        var failures = validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count == 0)
            return await next(cancellationToken);

        var errors = failures
            .GroupBy(f => f.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(f => f.ErrorMessage).ToArray());

        // Attempt to wrap into Result<T> if the response type supports it
        var responseType = typeof(TResponse);
        if (responseType.IsGenericType && responseType.GetGenericTypeDefinition() == typeof(Result<>))
        {
            var innerType = responseType.GetGenericArguments()[0];
            var failureMethod = typeof(Result<>)
                .MakeGenericType(innerType)
                .GetMethod(nameof(Result<object>.Failure))!;

            // Use localised summary message — falls back to English if locale not found
            var summary = localizer["ValidationFailed"].ResourceNotFound
                ? "One or more validation errors occurred."
                : localizer["ValidationFailed"].Value;

            var validationError = new ValidationError(
                "VALIDATION_FAILED",
                summary,
                errors);

            return (TResponse)failureMethod.Invoke(null, [validationError])!;
        }

        throw new ValidationException(failures);
    }
}
