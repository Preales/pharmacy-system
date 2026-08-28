# Design: Frontend Polish and Fixes

## Technical Approach

Nine mechanical fixes across Angular 19 frontend and .NET 10 backend. No new runtime logic, no API contract changes. Each issue is a targeted, isolated change. Deliver in 3 PRs as defined in proposal: PR1 (critical UX + Swagger), PR2 (code quality + structure), PR3 (data/cleanup/deps).

---

## Architecture Decisions

| # | Decision | Options | Chosen | Rationale |
|---|----------|---------|--------|-----------|
| 1 | `appendTo="body"` scope | All `p-select` vs dialog-only | Dialog-only | Only overlays inside `overflow:hidden` dialogs clip; global change would be noise |
| 2 | Constants shape | Enum vs const object vs plain string union | `const` object with `as const` | Tree-shakable, no runtime transpilation overhead, works with Angular standalone |
| 3 | CSS centralization scope | All component classes vs only shared layout classes | Only layout utilities (`.form-body`, `.field`, `.page-header`, `.actions-bar`, `.status-badge`) | POS/cart-specific styles are layout-unique — not shared |
| 4 | Template extraction scope | All 27 components vs 4 large ones | 4 largest only (pos, product-form, sales-history, stock-list) | Remaining components are ≤40 HTML lines; extracting them adds files with no readability gain |
| 5 | `PagedResult` re-export | Move + barrel re-export at old path vs hard move | Hard move, update 5 imports | Re-export would perpetuate cross-feature coupling — clean break is the goal |
| 6 | `glob` override target | `overrides` (npm) vs direct install | `overrides` in `package.json` | `glob` is a transitive dep of `@angular-devkit` — adding it directly pollutes `dependencies`; overrides is the correct npm v7+ mechanism |
| 7 | Swashbuckle 10.x JWT pattern | v6 `OpenApiSecurityRequirement` object init vs v10 `AddSecurityRequirement(doc => ...)` callback | v10 callback with `OpenApiSecuritySchemeReference` | Swashbuckle 10 changed the API: `AddSecurityRequirement` now takes a `Func<OpenApiDocument, OpenApiSecurityRequirement>` delegate; old object-init form does not compile |

---

## Data Flow

No data flow changes. All issues are structural (template, style, constant, file location) or configuration (Swagger, package override). The only observable runtime behavior change is Issue 1 (overlay escape from dialog DOM) and Issue 7 (currency symbol in rendered output).

    Issue 1: p-select overlay
    Before: dialog DOM → overflow:hidden clips overlay panel
    After:  appendTo="body" → overlay teleported to <body>, escapes clip

    Issue 10: Swagger JWT
    Before: AddSwaggerGen() → no Authorize button
    After:  AddSwaggerGen(opts => SecurityDefinition + SecurityRequirement) → Authorize button present

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `src/app/core/constants/app.constants.ts` | `AppRoles`, `AppStatus`, `Pagination` const objects |
| `src/app/core/models/shared.models.ts` | `PagedResult<T>` interface moved from catalog |
| `src/app/features/catalog/products/product-form.component.html` | Extracted template from `product-form.component.ts` |
| `src/app/features/sales/containers/pos.component.html` | Extracted template from `pos.component.ts` |
| `src/app/features/sales/containers/sales-history.component.html` | Extracted template from `sales-history.component.ts` |
| `src/app/features/inventory/containers/stock-list.component.html` | Extracted template from `stock-list.component.ts` |

### Modified Files

| File | Change |
|------|--------|
| `src/app/features/catalog/products/product-form.component.ts` | `appendTo="body"` on 3 `p-select`; `templateUrl`; `currency="COP"` on 2 `p-inputNumber` |
| `src/app/features/inventory/components/ingress-form.component.ts` | `appendTo="body"` on 2 `p-select`; `currency="COP"` on 1 `p-inputNumber` |
| `src/app/features/sales/containers/pos.component.ts` | `templateUrl`; `| currency` → `| currency:'COP'` (3 pipes); import `PagedResult` from `core/models/shared.models` |
| `src/app/features/sales/containers/sales-history.component.ts` | `templateUrl`; `| currency` → `| currency:'COP'` (3 pipes) |
| `src/app/features/sales/containers/sale-detail.component.ts` | `| currency` → `| currency:'COP'` |
| `src/app/features/inventory/containers/stock-list.component.ts` | `templateUrl` |
| `src/app/features/catalog/products/product-list.component.ts` | Import `PagedResult` from `core/models/shared.models` (if used) |
| `src/app/features/catalog/services/product.service.ts` | Import `PagedResult` from `core/models/shared.models`; use `Pagination.DefaultPageSize` |
| `src/app/features/inventory/services/inventory.service.ts` | Import `PagedResult` from `core/models/shared.models` |
| `src/app/features/sales/services/sales.service.ts` | Import `PagedResult` from `core/models/shared.models` |
| `src/app/app.routes.ts` | Use `AppRoles.Admin`, `AppRoles.Pharmacist` |
| `src/app/core/guards/role.guard.ts` | No change needed (roles come from route data, typed at call site) |
| `src/styles.scss` | Add `.form-body`, `.field`, `.page-header`, `.actions-bar`, `.status-badge` utility classes |
| `src/locale/angular.json` (`i18n.locales.es.translation`) | Keep `.xlf` reference; no change needed (only `.json` files deleted) |
| `src/backend/src/PharmacySystem.Api/Program.cs` | Replace `AddSwaggerGen()` with JWT security definition + requirement |
| `package.json` | Add `"overrides": { "glob": "^10.4.5" }` |

### Deleted Files

| File | Reason |
|------|--------|
| `src/app/features/catalog/models/paged-result.model.ts` | Moved to `core/models/shared.models.ts` |
| `src/locale/messages.es.json` | Dead artifact — never referenced |
| `src/locale/messages.en.json` | Dead artifact — never referenced |

---

## Interfaces / Contracts

### Issue 2 — app.constants.ts

```typescript
export const AppRoles = {
  Admin: 'Admin',
  Pharmacist: 'Pharmacist',
  Cashier: 'Cashier',
} as const;

export const AppStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
} as const;

export const Pagination = {
  DefaultPageSize: 20,
  PageSizeOptions: [10, 20, 50],
} as const;
```

### Issue 8 — shared.models.ts

```typescript
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
```

### Issue 10 — Swashbuckle 10.x pattern (CRITICAL: different from v6)

```csharp
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
```

> **Gotcha**: Swashbuckle 10.x `AddSecurityRequirement` takes a `Func<OpenApiDocument, OpenApiSecurityRequirement>` delegate. The v6 pattern using `new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = ... }] = [] }` does **not** compile in v10. Must add `using Microsoft.OpenApi.Models;` to `Program.cs`.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual QA | Dropdown opens correctly inside New Product and Record Ingress dialogs | Open dialogs, click each `p-select` |
| Manual QA | All currency values display as COP in POS, sales history, product form | Check rendered UI |
| Manual QA | Swagger UI shows "Authorize" button and accepts Bearer token | Open `/swagger`, click Authorize |
| Build | `ng build` passes after `glob` override | `npm install && ng build` in CI |
| Build | .NET build passes after `Program.cs` change | `dotnet build` |
| Smoke | App navigates without errors after CSS centralization | `ng serve` + manual navigation |

---

## Migration / Rollout

No migration required. Delivery order matches proposal:

- **PR 1** (Issues 1 + 10): `appendTo` fix on both forms + `Program.cs` Swagger JWT
- **PR 2** (Issues 2 + 4 + 5 + 8): constants file + CSS centralization + template extraction + `PagedResult` move
- **PR 3** (Issues 6 + 7 + 9): delete dead locale JSONs + COP currency + `glob` override

PR 3 is independent of PR 2 and can run in parallel.

---

## Open Questions

- [ ] `angular.json` has `i18n.locales.es.translation: "src/locale/messages.es.xlf"` — the `.xlf` file exists and must NOT be deleted (only the `.json` files go). Verify the `.xlf` is valid before merge.
- [ ] `sales-history.component.ts` has a `p-select` for status filter (line 56–62) that is NOT inside a `p-dialog`. Confirm no `appendTo` needed there (it is in a flat filter bar, not a modal).
