namespace PharmacySystem.Domain.Identity;

/// <summary>
/// Role name constants used across the system.
/// </summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string Pharmacist = "Pharmacist";
    public const string Clerk = "Clerk";

    public static readonly IReadOnlyList<string> All = [Admin, Pharmacist, Clerk];
}
