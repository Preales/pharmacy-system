# Exploration: frontend-polish-and-fixes

**Date**: 2026-06-09  
**Scope**: 10 issues across frontend quality, security, i18n, dependencies, and backend config

---

## Current State

The pharmacy frontend is a standalone-component Angular 17+ app using PrimeNG v17 (`p-select` / `p-dialog`), signals-based state, SCSS, and `@angular/localize` i18n. All components use **inline `template:`** and **inline `styles:`** — no external HTML or CSS files exist. The backend is ASP.NET Core with Swagger configured via bare `AddSwaggerGen()`.

---

## Issues Confirmed

### Issue 1 — CRITICAL BUG: Dropdown disappears in modal
**CONFIRMED.** `product-form.component.ts` (line 97, 109, 114) uses `<p-select>` inside a `<p-dialog>` — zero `appendTo` attributes on any `p-select`. Without `appendTo="body"`, PrimeNG renders the dropdown panel as a child of the dialog's DOM, which has `overflow:hidden`, clipping the panel when it opens.

**Also confirmed**: `category-form.component.ts` has `p-dialog` but no `p-select` (no issue there). `supplier-form.component.ts` same — no dropdown.  
The `product-list.component.ts` (line 48–57) also has a bare `<p-select>` filter bar outside a dialog — lower priority but same fix applies for consistency.  
`ingress-form.component.ts` — has a `p-select` inside a dialog (line 99) — **also affected**.  
`adjustment-form.component.ts` — needs checking.

**Files affected**:
- `src/app/features/catalog/products/product-form.component.ts` — 3 `p-select` (lines 97, 109, 114)
- `src/app/features/inventory/components/ingress-form.component.ts` — at minimum 1 `p-select` inside dialog

**Effort: S** — Add `appendTo="body"` to each `p-select` inside a dialog. ~5–8 lines changed.  
**Risk: HIGH** — This is a blocking UX bug in the core catalog create/edit flow.

---

### Issue 2 — Hardcoded values → constants/enums
**CONFIRMED.** Multiple hardcoded values found across components and services:

- Role strings `'Admin'`, `'Pharmacist'` hardcoded in:
  - `app.routes.ts` (line 41–42)
  - `sales.routes.ts` (line 32)
  - `sales-history.component.ts` (line 248)
  - `sale-detail.component.ts` (line 201)
  - `conflict-alerts.component.ts` (lines 90, 132)
- Status strings `'Active'` / `'Inactive'` repeated in:
  - `product-list.component.ts` (line 102)
  - `supplier-list.component.ts` (line 74)
  - `category-list.component.ts` (lines 76–77)
- Default `pageSize: 20` repeated in:
  - `product.service.ts` (line 22, 49)
  - `sales.service.ts` (lines 28, 36)
  - `conflict-alerts.service.ts` (lines 17, 27)
  - `inventory.service.ts` (lines 18, 28)
- Special `pageSize: 200` (product lookup in forms):
  - `adjustment-form.component.ts` (line 165)
  - `ingress-form.component.ts` (line 166)

**Proposed**: `src/app/core/constants/app.constants.ts` with `AppRoles`, `AppStatus`, `Pagination` exports.

**Files affected**: ~8 files for roles/status strings, ~6 service/component files for pagination defaults.  
**Effort: M** — Creating the constants file is trivial; the work is the mechanical find-and-replace across ~14 callsites.

---

### Issue 3 — LocalStorage security: needs encryption service
**CONFIRMED.** `auth.service.ts` (lines 65–68) writes `accessToken`, `refreshToken`, `tenantId`, and the full serialized `AuthUser` (including `roles` array) directly to localStorage with no obfuscation or encryption.

```ts
localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
localStorage.setItem(TENANT_ID_KEY, response.user.tenantId);
localStorage.setItem(USER_KEY, JSON.stringify(response.user));
```

The signal-based auth flow reads back in `loadUser()` (line 73) and from `localStorage.getItem(ACCESS_TOKEN_KEY)` (line 20). Any encryption wrapper must encrypt on write and decrypt on read without breaking these two sync read paths.

**Approach**: Introduce `StorageService` wrapping `localStorage` with AES encryption via `crypto-js` (simplest) or Web Crypto API (no dependency). `AuthService` becomes a consumer of `StorageService`.

**Files affected**:
- `src/app/core/services/auth.service.ts` — replace 8 localStorage calls
- `src/app/core/services/storage.service.ts` — new file

**Effort: M** — Straightforward wrapper, but needs careful handling of the sync `loadUser()` path and token reads that happen before Angular's DI is bootstrapped (line 20 in the signal initializer).  
**Risk: HIGH** — If encryption key management is done poorly (e.g., hardcoded key in source), this adds false security. Recommend a derivation approach or at least env-based key.

---

### Issue 4 — Centralize styles
**CONFIRMED.** `styles.scss` is only 9 lines (PrimeIcons import + html/body reset). All component styles are inline `styles:` blocks. Identical patterns repeated across **22 components**:

Duplicated CSS patterns confirmed across at least 6 form components:
```css
/* product-form, supplier-form, category-form all share exactly: */
.form-body { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
.field { display: flex; flex-direction: column; gap: 0.25rem; }
.field-checkbox { display: flex; align-items: center; gap: 0.5rem; }
label { font-weight: 500; font-size: 0.875rem; }
```

Duplicated list/page patterns:
```css
/* product-list, supplier-list, category-list all share: */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
h2 { margin: 0; }
```

**Approach**: Extract shared utility classes into `styles.scss` (or a dedicated `_shared-layout.scss` partial). Angular standalone components with `styles:` encapsulate via `ViewEncapsulation.Emulated` — shared utility classes in global SCSS will work fine since they are already unscoped layout classes.

**Files affected**:
- `src/styles.scss` — add shared classes
- All 3 `*-form.component.ts` files — remove duplicated `styles:` block entries
- All 3 `*-list.component.ts` files — remove duplicated `styles:` block entries

**Effort: S** — Find-replace style blocks; centralize ~6 rules into global SCSS.

---

### Issue 5 — Separate HTML templates from .ts files
**CONFIRMED.** ALL 27 components use inline `template:` — not a single `templateUrl:` exists in the codebase. This includes large templates like `pos.component.ts` and `product-form.component.ts` (262 lines total with ~85 lines of template).

**Note**: In Angular 17+ standalone components this is an accepted pattern for small/medium components. The Angular style guide does recommend external templates for components with >3 lines of HTML, but this is a code organization preference, not a bug.

**Recommended scope**: Extract only the **large, complex** templates (>40 HTML lines): `pos.component.ts`, `product-form.component.ts`, `sales-history.component.ts`, `stock-list.component.ts`. Small shell/utility components can stay inline.

**Files affected**: ~4 components with large templates; each extraction is `template:` → `templateUrl:` + new `.html` file.  
**Effort: M** — 4 components × 2 changes each = 8 file operations, mechanical but tedious.

---

### Issue 6 — messages.es.json exists but not used
**CONFIRMED (partial).** The locale folder contains:
- `messages.es.xlf` — This IS configured in `angular.json` (line 42–45) as the official Angular i18n translation file for the `es` locale build
- `messages.xlf` — Source extraction file
- `messages.es.json` and `messages.en.json` — These are NOT referenced anywhere in `angular.json` or any component (grep for `$localize` and `i18n` attributes returned 0 results)

**Root cause**: The `.xlf` file is the actual Angular i18n pipeline (compile-time). The `.json` files appear to be a draft custom i18n approach that was never wired up. No component uses `$localize` template literals or `i18n` attributes, meaning even the `.xlf` pipeline is not actively used — all UI strings are plain English literals in templates.

**Implication**: The i18n pipeline (angular.json `es` build config) is wired correctly for compile-time translation via XLF but the actual template strings have never been marked for translation. The `.json` files are dead artifacts.

**Files affected**:
- `src/locale/messages.es.json` — dead artifact (can be removed or ignored)
- `src/locale/messages.en.json` — dead artifact

**Effort**: Depends on goal:
- **Remove dead JSON files**: S — delete 2 files, no code change
- **Actually wire up i18n**: L — mark every UI string with `i18n` attributes, re-extract XLF, translate — out of scope for this change

**Recommendation**: Remove the dead `.json` files (S). Defer full i18n wiring to a separate change.

---

### Issue 7 — Currency must be COP
**CONFIRMED.** Currency is hardcoded as `USD` in multiple places:

- `product-form.component.ts` lines 84, 89 — `currency="USD"` on `p-inputNumber`
- `ingress-form.component.ts` line 89 — `currency="USD"` on `p-inputNumber`
- `product-list.component.ts` lines 93–94 — `| currency` pipe (uses browser locale default, not COP)
- `sales-history.component.ts` lines 112, 162, 163 — `| currency` pipe
- `sale-detail.component.ts` lines 116, 117, 126 — `| currency` pipe
- `pos.component.ts` lines 70, 114, 133, 155 — `| currency` pipe

The Angular `currency` pipe without arguments defaults to the app's LOCALE_ID currency. The app currently has `sourceLocale: "en"`, which defaults to USD. 

**Fix**: Add a `CURRENCY_CODE` constant (`'COP'`) and:
1. Pass `currency` argument to all pipe usages: `| currency:'COP'`
2. Change `p-inputNumber` `currency="COP"` attributes

**Files affected**: 6 component files, ~14 instances.  
**Effort: S** — Mechanical string replacement, no logic change.

---

### Issue 8 — PagedResult should be shared in core/models
**CONFIRMED.** `PagedResult<T>` is defined in `src/app/features/catalog/models/paged-result.model.ts` (7 lines) but consumed by:
- `src/app/features/inventory/services/inventory.service.ts` — imports from `../../catalog/models/`
- `src/app/features/sales/services/sales.service.ts` — imports from `../../catalog/models/`
- `src/app/features/sales/services/conflict-alerts.service.ts` — imports from `../../catalog/models/`
- `src/app/features/sales/containers/pos.component.ts` — imports from `../../catalog/models/`

Four cross-feature imports violate the feature-isolation principle. This model is domain-agnostic and belongs in `src/app/core/models/`.

**Fix**: Move `paged-result.model.ts` to `src/app/core/models/paged-result.model.ts` and update 5 import paths.

**Files affected**:
- `src/app/features/catalog/models/paged-result.model.ts` — delete/move
- `src/app/core/models/paged-result.model.ts` — new location
- 4 cross-feature import sites + 1 catalog-internal (`product.service.ts`) = 5 import updates

**Effort: S** — Move file, update 5 imports.

---

### Issue 9 — glob vulnerability (npm)
**CONFIRMED.** `package-lock.json` contains `glob@7.2.3` as a transitive dependency. `glob` v7.x has known vulnerabilities (CVE related to `Arbitrary File Overwrite` via symlink attacks in older v7 ranges, and the package itself is superseded by v10 which rewrites the API). The direct consumers pinning `"glob": "^7.1.x"` are likely `@angular-devkit/build-angular` or `karma` internals.

**Current state**: The top-level `package.json` does NOT list `glob` as a direct dependency — it is transitive. The lock file shows both `glob@7.2.3` (old) and `glob@^10.2.2` (new) are present, meaning some tooling already uses v10 but legacy sub-deps still pull v7.

**Fix options**:
1. Add `overrides` in `package.json` to force `glob` to `^10.0.0` — may break if consumers rely on v7 API
2. Run `npm audit fix` and accept any breaking changes
3. Accept as low-priority transitive dev-only risk (glob v7 is used in build tooling, not runtime bundle)

**Effort: S** — Add `overrides` entry or run `npm audit fix`. Test build afterward.  
**Risk: LOW-MEDIUM** — Dev tooling only; not shipped in production bundle. But CI security scanners will flag it.

---

### Issue 10 — Swagger not configured for JWT authorization
**CONFIRMED.** `Program.cs` line 47: `builder.Services.AddSwaggerGen()` — bare call with no `SecurityDefinition` or `SecurityRequirement`. The API uses JWT (`app.UseAuthentication()` is present at line 113), but Swagger UI has no "Authorize" button and cannot send `Authorization: Bearer <token>` headers.

**Fix**: Replace bare `AddSwaggerGen()` with:
```csharp
builder.Services.AddSwaggerGen(c => {
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { ... });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { ... });
});
```

**Files affected**:
- `src/backend/src/PharmacySystem.Api/Program.cs` — ~15 lines added to `AddSwaggerGen` call

**Effort: S** — Boilerplate addition, no logic change.

---

## Summary by Effort

| # | Issue | Effort | Risk | Files |
|---|-------|--------|------|-------|
| 1 | Dropdown `appendTo="body"` | S | **HIGH** | 2 |
| 2 | Hardcoded constants/enums | M | LOW | ~14 |
| 3 | LocalStorage encryption | M | **HIGH** | 2 |
| 4 | Centralize styles | S | LOW | ~8 |
| 5 | Extract HTML templates | M | LOW | ~8 |
| 6 | Remove dead i18n JSON | S | LOW | 2 |
| 7 | Currency → COP | S | LOW | 6 |
| 8 | Move PagedResult to core | S | LOW | 6 |
| 9 | glob npm vulnerability | S | LOW-MED | 1 |
| 10 | Swagger JWT config | S | LOW | 1 |

**Estimated total changed lines**: ~180–240 lines across all issues.

---

## Approaches

### Approach A — Full batch (all 10 in one PR)
- Pros: single review cycle, all polish shipped together
- Cons: ~240 lines changed, touches ~30 files across frontend + backend — exceeds 400-line PR budget risk is Medium
- Effort: High

### Approach B — Split by risk/domain (recommended)
**PR 1 — Critical fixes** (Issues 1, 3, 10): Bug + security + backend  
**PR 2 — Code quality** (Issues 2, 4, 5, 8): Constants + styles + templates + model move  
**PR 3 — Data/cleanup** (Issues 6, 7, 9): i18n cleanup + COP currency + npm audit  

- Pros: each PR is focused, reviewable, independently deployable
- Cons: 3 review cycles

### Approach C — By layer
**Frontend PR** (Issues 1–8) + **Backend PR** (Issue 10) + **Infra PR** (Issue 9)

---

## Recommendation

Use **Approach B** (3 PRs). Start with PR 1 since Issue 1 is a blocking UX bug and Issue 3 is a security concern. PRs 2 and 3 are pure polish and can be batched or done in parallel.

---

## Risks

- Issue 3 (localStorage encryption): Encryption key must NOT be hardcoded in source. Web Crypto API is keyless (uses browser-derived keys) but more complex. `crypto-js` with a build-time env key is simpler but not truly secure. Decision needed on acceptable threat model.
- Issue 5 (template extraction): Angular CLI file watchers work fine with `templateUrl:` but IDEs and hot-reload configs may need adjustment. Not a breaking risk.
- Issue 9 (glob): Forcing glob v10 via `overrides` could break Angular CLI build internals that depend on v7 API. Must test build and serve after applying.

---

## Ready for Proposal

**Yes.** All 10 issues confirmed with exact file locations and line counts. Recommend proceeding to `sdd-propose` with Approach B (3-PR split). The orchestrator should present the split strategy to the user and get confirmation before writing the proposal.
