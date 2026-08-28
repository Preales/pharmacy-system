using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PharmacySystem.Domain.Catalog;
using PharmacySystem.Domain.Identity;
using PharmacySystem.Domain.Inventory;
using PharmacySystem.Infrastructure.Identity;
using PharmacySystem.Infrastructure.Persistence;

namespace PharmacySystem.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds the database with demo data on first startup.
/// Call DataSeeder.SeedAsync(app.Services) in Program.cs before app.Run().
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILogger<PharmacyDbContext>>();

        try
        {
            var db = sp.GetRequiredService<PharmacyDbContext>();
            await db.Database.MigrateAsync();

            // Only seed if the database is empty (no tenants yet)
            if (await db.Tenants.AnyAsync())
            {
                logger.LogInformation("Seed data already present — skipping.");
                return;
            }

            logger.LogInformation("Seeding demo data...");

            var tenant = await SeedTenantAsync(db);
            await SeedUsersAsync(sp, tenant);
            var (categories, suppliers) = await SeedCatalogAsync(db, tenant.Id);
            await SeedProductsAndInventoryAsync(db, tenant.Id, categories, suppliers);

            logger.LogInformation("Demo data seeded successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
        }
    }

    // ─── Tenant ───────────────────────────────────────────────────────────────

    private static async Task<Tenant> SeedTenantAsync(PharmacyDbContext db)
    {
        var tenant = Tenant.Create("Demo Pharmacy", "demo");
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();
        return tenant;
    }

    // ─── Users ────────────────────────────────────────────────────────────────

    private static async Task SeedUsersAsync(IServiceProvider sp, Tenant tenant)
    {
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = sp.GetRequiredService<RoleManager<ApplicationRole>>();

        // Ensure roles exist
        foreach (var roleName in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
                await roleManager.CreateAsync(new ApplicationRole { Name = roleName });
        }

        await CreateUserAsync(userManager, tenant.Id,
            "admin@demo.com", "Admin123!", "Demo", "Admin", Roles.Admin);

        await CreateUserAsync(userManager, tenant.Id,
            "pharmacist@demo.com", "Pharma123!", "Demo", "Pharmacist", Roles.Pharmacist);
    }

    private static async Task CreateUserAsync(
        UserManager<ApplicationUser> userManager,
        Guid tenantId,
        string email,
        string password,
        string firstName,
        string lastName,
        string role)
    {
        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null) return;

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            TenantId = tenantId,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(user, role);
    }

    // ─── Catalog ─────────────────────────────────────────────────────────────

    private static async Task<(List<Category> categories, List<Supplier> suppliers)> SeedCatalogAsync(
        PharmacyDbContext db, Guid tenantId)
    {
        var categories = new List<Category>
        {
            new(tenantId, "Analgesics", "Pain relief medications"),
            new(tenantId, "Antibiotics", "Antibiotic medications"),
            new(tenantId, "Vitamins", "Vitamins and dietary supplements")
        };

        db.Categories.AddRange(categories);

        var suppliers = new List<Supplier>
        {
            new(tenantId, "PharmaCo", "John Smith", "sales@pharmaco.com", "+1-555-0100"),
            new(tenantId, "MediSupply", "Jane Doe", "orders@medisupply.com", "+1-555-0200")
        };

        db.Suppliers.AddRange(suppliers);
        await db.SaveChangesAsync();

        return (categories, suppliers);
    }

    // ─── Products + Inventory ────────────────────────────────────────────────

    private static async Task SeedProductsAndInventoryAsync(
        PharmacyDbContext db,
        Guid tenantId,
        List<Category> categories,
        List<Supplier> suppliers)
    {
        var analgesics = categories[0];
        var antibiotics = categories[1];
        var vitamins = categories[2];
        var pharmaCo = suppliers[0];
        var mediSupply = suppliers[1];

        var products = new List<Product>
        {
            new(tenantId, analgesics.Id, pharmaCo.Id, "Ibuprofen 200mg", "IBU-200", "Anti-inflammatory analgesic", 8.99m, 3.50m, ProductUnit.Box),
            new(tenantId, analgesics.Id, pharmaCo.Id, "Paracetamol 500mg", "PAR-500", "Common pain reliever and fever reducer", 5.50m, 2.00m, ProductUnit.Box),
            new(tenantId, analgesics.Id, mediSupply.Id, "Aspirin 100mg", "ASP-100", "Aspirin low dose for cardiovascular use", 6.75m, 2.50m, ProductUnit.Box),
            new(tenantId, analgesics.Id, pharmaCo.Id, "Naproxen 250mg", "NAP-250", "Non-steroidal anti-inflammatory", 12.50m, 5.00m, ProductUnit.Box),
            new(tenantId, antibiotics.Id, pharmaCo.Id, "Amoxicillin 500mg", "AMX-500", "Broad-spectrum antibiotic", 24.99m, 12.00m, ProductUnit.Box),
            new(tenantId, antibiotics.Id, mediSupply.Id, "Azithromycin 250mg", "AZI-250", "Macrolide antibiotic", 35.00m, 18.00m, ProductUnit.Blister),
            new(tenantId, antibiotics.Id, pharmaCo.Id, "Ciprofloxacin 500mg", "CIP-500", "Fluoroquinolone antibiotic", 29.99m, 14.00m, ProductUnit.Box),
            new(tenantId, vitamins.Id, mediSupply.Id, "Vitamin C 1000mg", "VIT-C1000", "High dose Vitamin C supplement", 18.50m, 7.00m, ProductUnit.Bottle),
            new(tenantId, vitamins.Id, mediSupply.Id, "Vitamin D3 2000IU", "VIT-D3", "Vitamin D3 supplement", 22.00m, 9.50m, ProductUnit.Bottle),
            new(tenantId, vitamins.Id, pharmaCo.Id, "Multivitamin Complete", "MVC-001", "Complete daily multivitamin", 28.00m, 11.00m, ProductUnit.Bottle)
        };

        db.Products.AddRange(products);
        await db.SaveChangesAsync();

        // Initial inventory items — seeded with healthy stock levels
        var stockLevels = new[] { 50, 80, 45, 30, 20, 15, 25, 60, 40, 35 };

        for (int i = 0; i < products.Count; i++)
        {
            var item = new InventoryItem(tenantId, products[i].Id, lowStockThreshold: 10);
            item.ApplyMovement(stockLevels[i]);
            db.InventoryItems.Add(item);
        }

        await db.SaveChangesAsync();
    }
}
