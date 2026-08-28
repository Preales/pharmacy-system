namespace PharmacySystem.Domain.Common.Interfaces;

public interface ICurrentTenantService
{
    Guid TenantId { get; set; }
}
