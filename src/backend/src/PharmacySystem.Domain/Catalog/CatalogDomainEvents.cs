using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Catalog;

public sealed record ProductCreatedEvent(
    Guid ProductId,
    Guid TenantId,
    string Name,
    string Sku) : DomainEvent;

public sealed record ProductUpdatedEvent(
    Guid ProductId,
    Guid TenantId,
    string Name) : DomainEvent;

public sealed record CategoryCreatedEvent(
    Guid CategoryId,
    Guid TenantId,
    string Name) : DomainEvent;
