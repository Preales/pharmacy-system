# Tasks: Frontend Quality Improvements

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1,100 (4 waves) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Wave 1) → PR 2 (Wave 2) → PR 3 (Wave 3) → PR 4 (Wave 4) |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Constants & COP currency | PR 1 | Base: `feat/frontend-quality-improvements`; ~60–80 lines |
| 2 | External templates | PR 2 | Base: PR 1 branch; ~400–500 lines (46 file ops, no logic) |
| 3 | Shared shell + navigation | PR 3 | Base: PR 2 branch; ~200–250 lines; smoke tests required |
| 4 | i18n tagging + translations | PR 4 | Base: PR 3 branch; ~250–300 lines; `ng build --localize` required |

---

## Phase 1: Constants & COP Currency (Wave 1)

- [x] 1.1 Add `AppCurrency = { COP: 'COP' } as const` to `src/app/core/constants/app.constants.ts`
- [x] 1.2 Add `LowStockThreshold = 10` to `app.constants.ts`
- [x] 1.3 Fix `Pagination.PageSizeOptions` to `[10, 25, 50]` in `app.constants.ts`
- [x] 1.4 Replace hardcoded threshold in `inventory/containers/low-stock.component.ts` → `LowStockThreshold`
- [x] 1.5 Replace pagination array in `catalog/products/product-list.component.ts` → `Pagination.PageSizeOptions`
- [x] 1.6 Replace pagination array in `inventory/containers/stock-list.component.ts` → `Pagination.PageSizeOptions`
- [x] 1.7 Replace `'COP'` literal in `sales/containers/pos.component.ts` → `AppCurrency.COP`
- [x] 1.8 Replace `'COP'` literal in `reports/containers/sales-report.component.ts` → `AppCurrency.COP`
- [x] 1.9 Replace `'COP'` literal in `reports/containers/inventory-report.component.ts` → `AppCurrency.COP`
- [x] 1.10 Verify: `ng build` passes; grep confirms zero `'COP'` literals outside `app.constants.ts`

## Phase 2: External Templates (Wave 2)

- [x] 2.1 Extract inline template from `app.component.ts` → `app.component.html`; switch to `templateUrl:`
- [x] 2.2 Extract `catalog-shell.component.ts` → `catalog-shell.component.html`
- [x] 2.3 Extract `inventory-shell.component.ts` → `inventory-shell.component.html`
- [x] 2.4 Extract `sales-shell.component.ts` → `sales-shell.component.html`
- [x] 2.5 Extract `reports-shell.component.ts` → `reports-shell.component.html`
- [x] 2.6 Extract remaining 18 container/component `.ts` files → individual `.component.html` files; update each `templateUrl:`
- [x] 2.7 Verify: grep confirms zero `template:` backtick strings in any `.component.ts`; 3 pre-existing NG4 type errors (readonly array vs mutable any[]) confirmed present on base branch before Wave 2 — not introduced by this wave

## Phase 3: Shared Shell + Navigation (Wave 3)

- [ ] 3.1 Create `src/app/shared/components/app-sidebar/app-sidebar.component.ts` — standalone, hardcoded `NAV_LINKS`, no `@Input`
- [ ] 3.2 Create `app-sidebar.component.html` — `routerLink` absolute paths, `routerLinkActive="active"`, logout button
- [ ] 3.3 Create `app-sidebar.component.scss` — single source of sidebar CSS (migrate from feature shells)
- [ ] 3.4 Create `src/app/shared/components/app-shell/app-shell.component.ts` — standalone layout host
- [ ] 3.5 Create `app-shell.component.html` — renders `<app-sidebar />` + `<router-outlet />`
- [ ] 3.6 Create `app-shell.component.scss` — flex layout container styles
- [ ] 3.7 Update `src/app/app.routes.ts` — nest all authenticated routes under `AppShellComponent`; add `canActivate: [authGuard]` at shell level; remove per-feature guard declarations
- [ ] 3.8 Confirm `roleGuard` on `/reports` inherits `data: { roles: [...] }` correctly via child route
- [ ] 3.9 Strip sidebar markup, CSS, and `AuthService` injection from `catalog-shell.component.ts`
- [ ] 3.10 Strip sidebar markup, CSS, and `AuthService` injection from `inventory-shell.component.ts`
- [ ] 3.11 Strip sidebar markup/CSS from `sales-shell.component.ts`; keep `SyncStatusBarComponent` in content area
- [ ] 3.12 Strip sidebar markup, CSS, and `AuthService` injection from `reports-shell.component.ts`
- [ ] 3.13 Remove superseded global sidebar CSS from `src/styles.scss`
- [ ] 3.14 Smoke test: unauthenticated access to `/catalog` redirects to `/login`
- [ ] 3.15 Smoke test: all 4 nav links visible and navigable from every authenticated page

## Phase 4: i18n Tagging + Translations (Wave 4)

- [ ] 4.1 Add `i18n="@@<key>"` to every user-visible string in all 27 `.component.html` files; use ICU format for dynamic/plural strings
- [ ] 4.2 Run `ng extract-i18n` → verify `src/locale/messages.xlf` is generated with zero errors
- [ ] 4.3 Populate all `<target>` elements in `src/locale/messages.es.xlf` with Spanish translations
- [ ] 4.4 Add `{ provide: LOCALE_ID, useValue: 'es-CO' }` and `registerLocaleData(localeEsCO)` to `src/app/app.config.ts`
- [ ] 4.5 Run `ng build --localize` — verify exit 0, zero empty translation warnings
- [ ] 4.6 Smoke test: currency pipe renders in `es-CO` format on `es` build
