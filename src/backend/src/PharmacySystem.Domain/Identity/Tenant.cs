using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Identity;

public class Tenant : AggregateRoot
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;

    private Tenant() { }

    public static Tenant Create(string name, string slug)
    {
        var tenant = new Tenant
        {
            Name = name,
            Slug = slug.ToLowerInvariant(),
            IsActive = true
        };
        tenant.AddDomainEvent(new TenantCreatedEvent(tenant.Id, tenant.Name));
        return tenant;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
