# Tasks: Frontend Polish and Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 lines total (PR1: ~50, PR2: ~120, PR3: ~30) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-always |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Critical bug fix + Swagger JWT | PR 1 | Base: `main`; Issues 1, 10 |
| 2 | Code quality + structure | PR 2 | Base: `main`; Issues 2, 4, 5, 8 |
| 3 | Data/cleanup/dependencies | PR 3 | Base: `main`; Issues 6, 7, 9; independent of PR 2 |

---

## Phase 1: PR 1 — Critical Bug Fix + Swagger JWT (Issues 1, 10)

- [x] 1.1 In `product-form.component.ts` (inline template): add `appendTo="body"` to all 3 `<p-select>` controls (category, supplier, unit) inside the `<p-dialog>`. Done when: dropdowns open without clipping in the New Product dialog.
- [x] 1.2 In `ingress-form.component.ts` (inline template): add `appendTo="body"` to the 2 `<p-select>` controls (product, supplier) inside the `<p-dialog>`. Done when: dropdowns open without clipping in the Record Ingress dialog. Also fixed `adjustment-form.component.ts` (1 `<p-select>` inside `<p-dialog>`, same issue).
- [x] 1.3 In `Program.cs` (`PharmacySystem.Api`): replace bare `AddSwaggerGen()` with the Swashbuckle 10.x pattern — `AddSecurityDefinition("bearer", ...)` + `AddSecurityRequirement(document => new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("bearer", document)] = [] })`. Added `using Microsoft.OpenApi;` (correct namespace for OpenApi 2.x — not `Microsoft.OpenApi.Models`). Done when: `dotnet build` passes and Swagger UI shows "Authorize" button.

---

## Phase 2: PR 2 — Code Quality + Structure (Issues 2, 4, 5, 8)

- [ ] 2.1 Create `src/app/core/constants/app.constants.ts` with `AppRoles`, `AppStatus`, and `Pagination` const objects (`as const`). Done when: file exists with the exact shape from design.
- [ ] 2.2 Update `src/app/app.routes.ts`: replace role string literals with `AppRoles.Admin`, `AppRoles.Pharmacist` (import from `app.constants.ts`). Done when: no bare role strings remain in routes.
- [ ] 2.3 In `src/styles.scss`: add global utility classes `.form-body`, `.field`, `.page-header`, `.actions-bar`, `.status-badge`. Done when: classes are defined globally and not redeclared in any component stylesheet.
- [ ] 2.4 Create `src/app/core/models/shared.models.ts` with `PagedResult<T>` interface (shape from design). Done when: file exists.
- [ ] 2.5 Delete `src/app/features/catalog/models/paged-result.model.ts`. Done when: file is removed.
- [ ] 2.6 Update imports in 5 files: `product.service.ts`, `inventory.service.ts`, `sales.service.ts`, `pos.component.ts`, `product-list.component.ts` (if used) — change `catalog/models/paged-result.model` → `core/models/shared.models`. Done when: `ng build` passes with no missing-import errors.
- [ ] 2.7 Update `product.service.ts`: replace hardcoded `20` with `Pagination.DefaultPageSize`. Done when: no magic `20` for page size in that file.
- [ ] 2.8 Extract inline template from `product-form.component.ts` → new file `product-form.component.html`; switch to `templateUrl`. Done when: `template:` property removed, `templateUrl` points to new file, build passes.
- [ ] 2.9 Extract inline template from `pos.component.ts` → `pos.component.html`; switch to `templateUrl`. Done when: same as 2.8.
- [ ] 2.10 Extract inline template from `sales-history.component.ts` → `sales-history.component.html`; switch to `templateUrl`. Done when: same as 2.8.
- [ ] 2.11 Extract inline template from `stock-list.component.ts` → `stock-list.component.html`; switch to `templateUrl`. Done when: same as 2.8.

---

## Phase 3: PR 3 — Data / Cleanup / Dependencies (Issues 6, 7, 9)

- [ ] 3.1 Delete `src/locale/messages.es.json` and `src/locale/messages.en.json`. Verify `src/locale/messages.es.xlf` is NOT deleted (`angular.json` references it). Done when: `.json` files absent, `.xlf` file present, `ng build` passes.
- [ ] 3.2 Update currency pipes in `pos.component.html` (3 occurrences), `sales-history.component.html` (3 occurrences), and `sale-detail.component.ts`: change `| currency` → `| currency:'COP'`. Done when: no USD symbol appears in POS or sales history views.
- [ ] 3.3 Update `product-form.component.html` and `ingress-form.component.ts`: set `currency="COP"` on `p-inputNumber` controls (2 in product form, 1 in ingress form). Done when: price inputs format in COP.
- [ ] 3.4 In `package.json`: add `"overrides": { "glob": "^10.4.5" }` at root level. Run `npm install`. Done when: `npm audit` reports no `glob@7.x` vulnerability and `ng build` succeeds.
