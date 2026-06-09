using System.Globalization;
using System.Threading.RateLimiting;
using Asp.Versioning;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;
using PharmacySystem.Api.Middleware;
using PharmacySystem.Application;
using PharmacySystem.Infrastructure;
using PharmacySystem.Infrastructure.Persistence;
using PharmacySystem.Infrastructure.Persistence.Seed;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "PharmacySystem")
        .WriteTo.Console());

    // Application & Infrastructure layers
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);

    // Controllers + API versioning
    builder.Services.AddControllers();
    builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
    });

    // Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "JWT Authorization header using the Bearer scheme. Enter token only (no 'Bearer' prefix)."
        });
        options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("bearer", document)] = []
        });
    });

    // Health checks
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<PharmacySystem.Infrastructure.Persistence.PharmacyDbContext>();

    // CORS
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(
                    builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                    ?? ["http://localhost:4200"])
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    builder.Services.AddHttpContextAccessor();

    // Rate limiting — fixed window: 100 requests/min per IP for auth endpoints
    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("auth", limiter =>
        {
            limiter.Window = TimeSpan.FromMinutes(1);
            limiter.PermitLimit = 100;
            limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            limiter.QueueLimit = 0;
        });
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });

    // Request Localization — en + es
    var supportedCultures = new[] { "en", "es" };
    builder.Services.Configure<RequestLocalizationOptions>(opts =>
    {
        opts.DefaultRequestCulture = new Microsoft.AspNetCore.Localization.RequestCulture("en");
        opts.SupportedCultures = supportedCultures.Select(c => new CultureInfo(c)).ToList();
        opts.SupportedUICultures = supportedCultures.Select(c => new CultureInfo(c)).ToList();
        opts.RequestCultureProviders =
        [
            new Microsoft.AspNetCore.Localization.AcceptLanguageHeaderRequestCultureProvider()
        ];
    });

    var app = builder.Build();

    // Middleware pipeline
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Pharmacy System API v1"));
    }

    app.UseSerilogRequestLogging();
    app.UseRequestLocalization();
    app.UseRateLimiter();
    app.UseCors();

    app.UseMiddleware<TenantMiddleware>();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHealthChecks("/health");

    Log.Information("Starting Pharmacy System API");

    // Seed demo data on first run
    await DataSeeder.SeedAsync(app.Services);

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
