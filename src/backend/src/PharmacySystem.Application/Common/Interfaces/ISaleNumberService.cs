namespace PharmacySystem.Application.Common.Interfaces;

/// <summary>
/// Generates unique, sequential sale numbers in the format SALE-{YYYYMMDD}-{sequence}.
/// Sequence is scoped per tenant per day.
/// </summary>
public interface ISaleNumberService
{
    /// <summary>
    /// Generates the next sale number for the current tenant and UTC date.
    /// The sequence resets to 1 each calendar day.
    /// </summary>
    Task<string> GenerateAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
