# Proposal: Frontend Polish and Fixes

## Intent

The pharmacy frontend and its backend API have accumulated 9 distinct quality issues: a blocking UX bug (dropdown clipping in modals), hardcoded magic values, duplicated CSS, large inline templates, dead i18n artifacts, wrong currency code, a misplaced shared model, a vulnerable transitive dependency, and an unconfigured Swagger JWT definition. None of these block compilation, but together they degrade developer experience, introduce UX failures visible to end users, and carry low-level security/compliance risk. This change resolves all 9 issues in 3 focused PRs.

## Scope

### In Scope

- **Issue 1**: Add `appendTo="body"` to all `<p-select>` inside `<p-dialog>` (product-form, ingress-form)
- **Issue 2**: Extract role strings, status strings, and pagination defaults into `core/constants/app.constants.ts`
- **Issue 4**: Centralize `.form-body`, `.field`, `.page-header` CSS into global `styles.scss`
- **Issue 5**: Extract inline `template:` to `.html` files for 4 large components (pos, product-form, sales-history, stock-list)
- **Issue 6**: Remove dead `messages.es.json` and `messages.en.json` locale artifacts
- **Issue 7**: Replace all `currency="USD"` / `| currency` usages with `COP` (14 instances, 6 components)
- **Issue 8**: Move `PagedResult<T>` from `catalog/models/` to `core/models/`; update 5 import sites
- **Issue 9**: Resolve `glob` v7 vulnerability via `package.json` overrides or `npm audit fix`
- **Issue 10**: Configure Swagger JWT `SecurityDefinition` + `SecurityRequirement` in `Program.cs`

### Out of Scope

- **Issue 3 (localStorage encryption)**: Explicitly descoped — risk acknowledged and accepted by stakeholder
- Full i18n wiring (marking templates with `i18n` attributes, re-extracting XLF, translating strings)
- Angular `LOCALE_ID` provider change or full locale configuration
- Upgrading Angular, PrimeNG, or other major dependencies

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `product-catalog`: `p-select appendTo` fix + constants + template extraction + COP currency (Issues 1, 2, 5, 7)
- `inventory-management`: `p-select appendTo` fix + `PagedResult` import update (Issues 1, 8)
- `sales-processing`: constants + COP currency + `PagedResult` import update (Issues 2, 7, 8)
- `cross-cutting`: shared constants file, global CSS centralization, `PagedResult` move to core (Issues 2, 4, 8)
- `identity-auth`: no change (Issue 3 descoped)

## Approach

Three PRs in sequence to keep reviews focused and independently deployable:

| PR | Issues | Lines | Focus |
|----|--------|-------|-------|
| PR 1 | 1, 10 | ~50 | Critical UX bug + Swagger JWT |
| PR 2 | 2, 4, 5, 8 | ~120 | Code quality + structure |
| PR 3 | 6, 7, 9 | ~30 | Data/cleanup/dependencies |

All changes are mechanical — no new runtime logic, no new Angular services, no API contract changes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/features/catalog/products/product-form.component.ts` | Modified | `appendTo="body"` on 3 `p-select`; template extraction; currency COP |
| `src/app/features/inventory/components/ingress-form.component.ts` | Modified | `appendTo="body"` on 1 `p-select` |
| `src/app/core/constants/app.constants.ts` | New | `AppRoles`, `AppStatus`, `Pagination` constants |
| `src/styles.scss` | Modified | Add `.form-body`, `.field`, `.page-header` shared utility classes |
| `src/app/core/models/paged-result.model.ts` | New | Moved from `catalog/models/` |
| `src/app/features/catalog/models/paged-result.model.ts` | Removed | Replaced by core location |
| `src/locale/messages.es.json`, `messages.en.json` | Removed | Dead artifacts |
| `src/backend/src/PharmacySystem.Api/Program.cs` | Modified | Swagger JWT `SecurityDefinition` + `SecurityRequirement` |
| `package.json` | Modified | `overrides` for `glob` to resolve v7 vulnerability |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `glob` override breaks Angular CLI build | Low-Med | Test `ng build` and `ng serve` after applying; revert override if broken, accept transitive risk |
| Template extraction breaks hot-reload in dev | Low | Verify `ng serve --hmr` after each extraction; `.html` files are watched by default |
| CSS centralization breaks component-scoped styles | Low | Utility classes are layout-only and already unscoped; verify visually after change |
| `appendTo="body"` causes z-index stacking issues | Low | Manual QA of dropdown in modal after fix |

## Rollback Plan

Each PR is independently revertable via `git revert <merge-commit>`. PR 2 introduces a new constants file and moves `PagedResult` — if reverted, restore original import paths. No database migrations, no API contract changes, no feature flags required.

## Dependencies

- PR 1 can merge immediately (no prerequisites)
- PR 2 depends on PR 1 merged (constants may reference currency code added in PR 3, so coordinate or inline `CURRENCY_CODE` in PR 2)
- PR 3 is independent of PR 2 and can run in parallel

## Success Criteria

- [ ] Dropdowns open correctly inside all dialogs (no clipping) — manual QA
- [ ] No hardcoded `'Admin'`, `'Pharmacist'`, `'Active'`, `'Inactive'`, or `20`/`200` pageSize literals outside `app.constants.ts`
- [ ] `styles.scss` contains `.form-body`, `.field`, `.page-header`; form/list components no longer duplicate them
- [ ] `pos`, `product-form`, `sales-history`, `stock-list` use `templateUrl:` pointing to `.html` files
- [ ] `messages.es.json` and `messages.en.json` deleted from `src/locale/`
- [ ] All currency displays show COP values in UI
- [ ] `PagedResult<T>` imported from `core/models/` across all consumers; no cross-feature catalog imports remain
- [ ] `npm audit` reports no `glob` v7 vulnerability (or risk explicitly accepted with documented reason)
- [ ] Swagger UI shows "Authorize" button and accepts Bearer token
- [ ] All 3 PRs pass CI (build + lint)
