using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PharmacySystem.Application.Common.Interfaces;

namespace PharmacySystem.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior that wraps each command in a database transaction.
/// Commits on success, rolls back on exception.
/// Only applies to requests that implement ITransactionalCommand.
/// </summary>
public class TransactionBehavior<TRequest, TResponse>(
    IPharmacyDbContext dbContext,
    ILogger<TransactionBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // Only wrap in transaction if the request opts in
        if (request is not ITransactionalCommand)
            return await next(cancellationToken);

        var requestName = typeof(TRequest).Name;

        // Access the underlying DbContext to get a raw transaction
        if (dbContext is not DbContext efContext)
            return await next(cancellationToken);

        await using var transaction = await efContext.Database
            .BeginTransactionAsync(cancellationToken);

        logger.LogInformation("Beginning transaction for {RequestName}", requestName);

        try
        {
            var response = await next(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Committed transaction for {RequestName}", requestName);

            return response;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            logger.LogError(ex, "Rolled back transaction for {RequestName}", requestName);
            throw;
        }
    }
}

/// <summary>
/// Marker interface — commands implementing this will be wrapped in a DB transaction
/// by TransactionBehavior in the MediatR pipeline.
/// </summary>
public interface ITransactionalCommand;
