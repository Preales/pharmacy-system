using MediatR;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Application.Identity.DTOs;
using PharmacySystem.Application.Identity.Mappings;
using PharmacySystem.Domain.Common;
using PharmacySystem.Domain.Common.Interfaces;

namespace PharmacySystem.Application.Identity.Queries;

// ─── Query ──────────────────────────────────────────────────────────────────

public record GetCurrentUserQuery : IRequest<Result<UserDto>>;

// ─── Handler ────────────────────────────────────────────────────────────────

public class GetCurrentUserQueryHandler(
    IUserManagerService userManager,
    ICurrentUserService currentUser) : IRequestHandler<GetCurrentUserQuery, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
            return Result<UserDto>.Failure(
                new UnauthorizedError("Auth.NotAuthenticated", "User is not authenticated."));

        var user = await userManager.FindByIdAsync(currentUser.UserId);
        if (user is null)
            return Result<UserDto>.Failure(
                new NotFoundError("User.NotFound", "Current user not found."));

        var roles = await userManager.GetRolesAsync(user.Id);
        return Result<UserDto>.Success(user.ToDto(roles.FirstOrDefault() ?? string.Empty));
    }
}
