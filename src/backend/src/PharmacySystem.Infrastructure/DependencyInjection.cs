using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PharmacySystem.Application.Common.Interfaces;
using PharmacySystem.Application.Identity.Commands;
using PharmacySystem.Domain.Common.Interfaces;
using PharmacySystem.Infrastructure.Identity;
using PharmacySystem.Infrastructure.Persistence;
using PharmacySystem.Infrastructure.Persistence.Interceptors;
using PharmacySystem.Infrastructure.Services;

namespace PharmacySystem.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Scoped request services
        services.AddScoped<ICurrentTenantService, CurrentTenantService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // EF interceptors (scoped so they can access ICurrentTenantService/ICurrentUserService)
        services.AddScoped<AuditInterceptor>();
        services.AddScoped<SoftDeleteInterceptor>();
        services.AddScoped<TenantInterceptor>();

        // EF Core DbContext
        services.AddDbContext<PharmacyDbContext>((sp, options) =>
        {
            options.UseSqlServer(
                configuration.GetConnectionString("Default"),
                sql => sql.MigrationsAssembly(typeof(PharmacyDbContext).Assembly.FullName));

            options.AddInterceptors(
                sp.GetRequiredService<TenantInterceptor>(),
                sp.GetRequiredService<AuditInterceptor>(),
                sp.GetRequiredService<SoftDeleteInterceptor>());
        });

        services.AddScoped<IPharmacyDbContext>(sp =>
            sp.GetRequiredService<PharmacyDbContext>());

        // ASP.NET Identity
        services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = true;
                options.Password.RequiredLength = 6;
                options.User.RequireUniqueEmail = false; // email uniqueness is per-tenant, not global
            })
            .AddEntityFrameworkStores<PharmacyDbContext>()
            .AddDefaultTokenProviders();

        // JWT Bearer authentication
        var jwtSecret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret is not configured.");

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    ClockSkew = TimeSpan.Zero
                };
            });

        // Authorization policies
        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminPolicy", policy => policy.RequireRole("Admin"));
            options.AddPolicy("PharmacistPolicy", policy => policy.RequireRole("Admin", "Pharmacist"));
            options.AddPolicy("CashierPolicy", policy => policy.RequireRole("Admin", "Pharmacist", "Clerk"));
        });

        // Application-layer service abstractions
        services.AddScoped<IUserManagerService, UserManagerService>();
        services.AddScoped<ITokenService, JwtTokenService>();

        // Sales services
        services.AddScoped<ISaleNumberService, SaleNumberService>();

        return services;
    }
}
