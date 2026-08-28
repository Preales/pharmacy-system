# Proposal: Frontend Quality Improvements

## Intent

The Angular 19 frontend has accumulated six structural quality issues that increase maintenance cost and limit future work: hardcoded magic values scattered across components, duplicated sidebar CSS (~70 lines × 4 shells), 23 inline templates that hinder tooling and i18n, an unused i18n infrastructure, a hardcoded `'COP'` currency string in 9+ locations, and no inter-feature navigation. Resolving these issues now lowers change cost for all future features and unblocks a meaningful i18n rollout.

## Scope

### In Scope
- **#1** Extend `app.constants.ts` with missing constants (`LowStockThreshold`, normalized pagination options); replace all magic values in components with imports.
- **#5** Add `AppCurrency` constant; replace all `'COP'` string literals across 6 files.
- **#3** Extract all 23 inline `template:` blocks to `.component.html` files via `templateUrl:`.
- **#2** Create `AppSidebarComponent` with shared sidebar markup + scoped CSS; refactor all 4 feature shells to use it.
- **#6** Introduce `AppShellComponent` as the authenticated layout wrapper; restructure routes so all authenticated features are children; add inter-feature nav links.
- **#4** Tag all user-visible strings with `i18n="@@key"` attributes; run `ng extract-i18n`; populate `messages.es.xlf` with Spanish translations.

### Out of Scope
- localStorage encryption (explicitly descoped).
- Custom `CopCurrencyPipe` wrapper (optional future enhancement; constant approach is sufficient for now).
- New feature development or backend changes.

## Capabilities

### New Capabilities
- `app-shell-navigation`: Top-level authenticated layout with inter-feature navigation via `AppShellComponent`.
- `frontend-i18n`: Full i18n tagging pass, extraction, and Spanish XLIFF translations for the `es` build.

### Modified Capabilities
- `cross-cutting`: Constants/enum usage policy extended; sidebar style centralization; `templateUrl` convention enforced.

## Approach

Four sequential waves following the exploration recommendation:

1. **Wave 1 — Constants** (S): Extend `app.constants.ts`, update all import sites. Zero logic change.
2. **Wave 2 — Template extraction** (M): Mechanical `template:` → `templateUrl:` split for all 23 components. Improves tooling before subsequent waves touch templates.
3. **Wave 3 — Shell refactor** (M): Build `AppSidebarComponent` (resolves #2); build `AppShellComponent` with global nav (resolves #6); nest authenticated routes as children; remove per-shell sidebar duplication.
4. **Wave 4 — i18n** (L): Tag templates, extract, translate. Benefits from external `.html` files produced in Wave 2.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/core/constants/app.constants.ts` | Modified | Add `AppCurrency`, `LowStockThreshold`, normalize `Pagination` options |
| `app/app.component.ts` | Modified | Delegate layout to `AppShellComponent` |
| `app/app.routes.ts` | Modified | Nest authenticated routes under `AppShellComponent` |
| `app/shared/components/app-shell/` | New | `AppShellComponent` — authenticated layout + global nav |
| `app/shared/components/app-sidebar/` | New | `AppSidebarComponent` — shared sidebar with Input-driven nav items |
| `app/features/*/\*-shell.component.ts` | Modified | Remove duplicated sidebar CSS and markup; use `AppSidebarComponent` |
| 23 inline component `.ts` files | Modified | Move `template:` to new `.component.html` file; add `templateUrl:` |
| All 27 component templates | Modified | Add `i18n="@@key"` attributes to user-visible strings |
| `src/locale/messages.es.xlf` | Modified | Populate with Spanish translations |
| `src/styles.scss` | Modified | Remove sidebar rules superseded by `AppSidebarComponent` scoped styles |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSS specificity regression when sidebar moves from encapsulated to shared component | Med | Visual smoke test across all 4 feature shells after Wave 3 |
| Auth guard mis-wiring after route restructuring | Med | Verify guards fire on each authenticated route in dev before merging Wave 3 |
| i18n tag syntax error on interpolated strings | Med | Use ICU format / `$localize` for dynamic strings; CI `ng build --localize` catches errors |
| Merge conflicts (many files touched) | Low | Execute waves sequentially; each wave is its own PR |

## Rollback Plan

Each wave is delivered as an independent PR targeting the feature branch. To roll back a wave: revert that PR. Waves 1 and 2 are pure refactors (no behavior change) — revert is safe. Wave 3 route restructuring can be reverted by restoring `app.routes.ts` and the 4 shell components from the previous commit. Wave 4 can be disabled by removing the `es` build configuration from `angular.json`.

## Dependencies

- Spanish translator required before Wave 4 can ship meaningful output.
- No new npm dependencies — `AppSidebarComponent` and `AppShellComponent` use Angular standalone + PrimeNG (already installed).

## Success Criteria

- [ ] Zero `'COP'` string literals remain outside `app.constants.ts`.
- [ ] Zero hardcoded pagination/status/threshold magic values remain in component files.
- [ ] All 27 components use `templateUrl:` (zero inline `template:` blocks).
- [ ] All 4 feature shells use `AppSidebarComponent`; sidebar CSS exists in exactly one place.
- [ ] A logged-in user can navigate from any feature to any other feature without editing the URL.
- [ ] `ng build --localize` produces a valid `es` build with no empty translation units.
- [ ] `ng build` (default) passes with zero compilation errors after each wave.
