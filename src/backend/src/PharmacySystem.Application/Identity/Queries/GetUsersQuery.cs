using MediatR;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;

namespace PharmacySystem.Application.Identity.Queries;

// ─── Query ──────────────────────────────────────────────────────────────────

public record GetUsersQuery : IRequest<Result<IReadOnlyList<UserDto>>>;

// ─── Handler ────────────────────────────────────────────────────────────────

public class GetUsersQueryHandler(
    IUserManagerService userManager,
    ICurrentTenantService tenantService) : IRequestHandler<GetUsersQuery, Result<IReadOnlyList<UserDto>>>
{
    public async Task<Result<IReadOnlyList<UserDto>>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var tenantId = tenantService.TenantId;
        var users = await userManager.GetUsersByTenantAsync(tenantId);

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user.Id);
            dtos.Add(user.ToDto(roles.FirstOrDefault() ?? string.Empty));
        }

        return Result<IReadOnlyList<UserDto>>.Success(dtos.AsReadOnly());
    }
}
