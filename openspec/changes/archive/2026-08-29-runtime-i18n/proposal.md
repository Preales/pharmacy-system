# Proposal: Runtime i18n Migration (ngx-translate)

## Intent

The pharmacy frontend currently ships with Angular's compile-time i18n wired in `angular.json` but the translation file (`messages.es.xlf`) is empty and the mechanism cannot switch languages at runtime. Users have no way to toggle between English and Spanish without a full page reload or a separate build. This change replaces compile-time i18n with `@ngx-translate/core` to enable seamless, runtime language switching across all 23 affected components.

## Scope

### In Scope
- Install `@ngx-translate/core` + `@ngx-translate/http-loader`
- Remove Angular compile-time i18n block from `angular.json`
- Wire `TranslateModule` in `app.config.ts` with `HttpLoaderFactory` loading from `assets/i18n/`
- Create `src/assets/i18n/en.json` and `es.json` with ~280 strings
- Add `TranslatePipe` to `imports[]` of all 23 affected components
- Pipe all template strings with `| translate`
- Inject `TranslateService` in ~15 components for toast/confirm strings
- Fix `typeOptions` static arrays in `movement-history` + `sales-history` → computed methods
- Add language toggle button to `AppHeaderComponent` (EN/ES)
- Persist language preference to `localStorage`

### Out of Scope
- Third language support
- Server-side rendering (SSR) i18n
- Translation management tooling / CMS integration
- Lazy-loaded per-feature translation bundles

## Capabilities

### New Capabilities
- `runtime-i18n`: Runtime language switching (EN/ES) via ngx-translate, language persistence, and toggle UI in app header

### Modified Capabilities
- `app-shell-layout`: AppHeaderComponent gains a language toggle control alongside the existing dark-mode toggle
- `cross-cutting`: Language preference persistence strategy (localStorage) added as a cross-cutting concern

## Approach

1. **Infrastructure first** — install packages, remove compile-time block, wire `TranslateModule` globally, create translation JSON files, add toggle to `AppHeaderComponent`. This unblocks all subsequent PRs.
2. **Component migration in slices** — add `TranslatePipe` to imports and pipe template strings per domain slice (shared/auth/catalog → inventory/sales → reports/users). Each slice is independently reviewable.
3. **Dynamic options fix** — convert `typeOptions` static arrays to `computed()` methods that call `TranslateService.instant()` so options re-render on language change.
4. Language default: detect `localStorage` → browser `navigator.language` → fallback `en`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `angular.json` | Modified | Remove compile-time i18n block |
| `app.config.ts` | Modified | Wire TranslateModule + HttpLoaderFactory |
| `src/assets/i18n/` | New | en.json + es.json (~280 strings each) |
| `src/frontend/pharmacy-frontend/src/app/shared/` | Modified | TranslatePipe + piped strings in shared components |
| `src/frontend/pharmacy-frontend/src/app/auth/` | Modified | TranslatePipe + piped strings |
| `src/frontend/pharmacy-frontend/src/app/catalog/` | Modified | TranslatePipe + piped strings |
| `src/frontend/pharmacy-frontend/src/app/inventory/` | Modified | TranslatePipe + TranslateService; typeOptions fix |
| `src/frontend/pharmacy-frontend/src/app/sales/` | Modified | TranslatePipe + TranslateService; typeOptions fix |
| `src/frontend/pharmacy-frontend/src/app/reports/` | Modified | TranslatePipe + TranslateService |
| `src/frontend/pharmacy-frontend/src/app/users/` | Modified | TranslatePipe + TranslateService |
| `AppHeaderComponent` | Modified | Language toggle button (EN/ES) + localStorage persistence |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing translation key shows raw key in UI | Med | Lint JSON keys against component template strings in PR review |
| Static `typeOptions` arrays not re-evaluated on toggle | Med | Convert to `computed()` methods before component PRs land |
| `angular.json` removal breaks existing CI build command | Low | Verify build passes in PR 1 before merging |
| Translation file grows unbounded without governance | Low | Single flat namespace per language file; reviewed in PR 1 |

## Rollback Plan

1. Revert `angular.json` i18n block (git revert PR 1 commit).
2. Remove `@ngx-translate/core` + `@ngx-translate/http-loader` from `package.json` and run `npm install`.
3. Remove `TranslateModule` from `app.config.ts`.
4. Restore static `typeOptions` arrays from git history.
5. All template `| translate` pipes become harmless no-ops until removed — app will display raw keys briefly; fix in follow-up commit.

## Dependencies

- `@ngx-translate/core` ^16.x (Angular 19 compatible)
- `@ngx-translate/http-loader` ^16.x
- `HttpClient` already provided in `app.config.ts` — no extra setup needed

## Success Criteria

- [ ] Language toggles between EN and ES without page reload across all 23 components
- [ ] Selected language persists after browser refresh (localStorage)
- [ ] No raw translation keys visible in any route under either language
- [ ] `ng build` completes without errors or warnings related to i18n
- [ ] `typeOptions` dropdowns (movement-history, sales-history) re-render correctly on toggle
- [ ] Toast and confirm dialog strings are translated in all 15 affected components
