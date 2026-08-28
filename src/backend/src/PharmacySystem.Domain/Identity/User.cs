using PharmacySystem.Domain.Common;

namespace PharmacySystem.Domain.Identity;

public class User : AggregateRoot
{
    public string Email { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Role { get; private set; } = Roles.Clerk;

    private User() { }

    public static User Create(string email, string firstName, string lastName, Guid tenantId, string role = Roles.Clerk)
    {
        var user = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            TenantId = tenantId,
            Role = role
        };
        user.AddDomainEvent(new UserRegisteredEvent(user.Id, user.Email, tenantId));
        return user;
    }

    public string FullName => $"{FirstName} {LastName}";
}
