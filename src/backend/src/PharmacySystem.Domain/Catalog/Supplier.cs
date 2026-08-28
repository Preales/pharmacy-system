using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Catalog;

public class Supplier : AggregateRoot
{
    private Supplier() { } // EF constructor

    public Supplier(Guid tenantId, string name, string? contactName, string? contactEmail, string? phone)
    {
        TenantId = tenantId;
        Name = name;
        ContactName = contactName;
        ContactEmail = contactEmail;
        Phone = phone;
        IsActive = true;
    }

    public string Name { get; private set; } = string.Empty;
    public string? ContactName { get; private set; }
    public string? ContactEmail { get; private set; }
    public string? Phone { get; private set; }
    public bool IsActive { get; private set; }

    // Navigation
    public ICollection<Product> Products { get; private set; } = [];

    public void Update(string name, string? contactName, string? contactEmail, string? phone)
    {
        Name = name;
        ContactName = contactName;
        ContactEmail = contactEmail;
        Phone = phone;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
