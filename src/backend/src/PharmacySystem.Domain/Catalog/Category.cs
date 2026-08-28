using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Catalog;

public class Category : AggregateRoot
{
    private Category() { } // EF constructor

    public Category(Guid tenantId, string name, string? description, Guid? parentCategoryId = null)
    {
        TenantId = tenantId;
        Name = name;
        Description = description;
        ParentCategoryId = parentCategoryId;
        IsActive = true;

        AddDomainEvent(new CategoryCreatedEvent(Id, tenantId, name));
    }

    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public Guid? ParentCategoryId { get; private set; }
    public bool IsActive { get; private set; }

    // Navigation
    public Category? ParentCategory { get; private set; }
    public ICollection<Category> SubCategories { get; private set; } = [];
    public ICollection<Product> Products { get; private set; } = [];

    public void Update(string name, string? description, Guid? parentCategoryId = null)
    {
        Name = name;
        Description = description;
        ParentCategoryId = parentCategoryId;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
