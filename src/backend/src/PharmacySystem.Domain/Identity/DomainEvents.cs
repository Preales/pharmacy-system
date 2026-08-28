using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Identity;

public record UserRegisteredEvent(Guid UserId, string Email, Guid TenantId) : DomainEvent;

public record TenantCreatedEvent(Guid TenantId, string Name) : DomainEvent;
