# Tasks: Runtime i18n Migration (ngx-translate)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400–420 (across 4 PRs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Infrastructure + JSON files + header toggle | PR 1 (~120 lines) | Base: `feature/runtime-i18n`; self-contained; app boots with i18n |
| 2 | Shared + auth + catalog (7 components, ~90 strings) | PR 2 (~90 lines) | Base: PR 1 branch |
| 3 | Inventory + sales (9 components, ~120 strings) | PR 3 (~120 lines) | Base: PR 2 branch |
| 4 | Reports + users + cleanup (6 components, ~70 strings) | PR 4 (~70 lines) | Base: PR 3 branch; tracker merges to main |

---

## Phase 1: Infrastructure / Foundation (→ PR 1)

- [x] 1.1 Install `@ngx-translate/core@15` and `@ngx-translate/http-loader@8`; update `package.json` and lock file.
- [x] 1.2 Create `src/app/core/i18n/translate.provider.ts` — export `provideTranslation()` using `TranslateModule.forRoot()` + `TranslateHttpLoader` pointing to `assets/i18n/`.
- [x] 1.3 Modify `src/app/app.config.ts` — add `provideTranslation()`, remove `LOCALE_ID` provider.
- [x] 1.4 Modify `angular.json` — remove the `i18n` build block; add `assets/i18n/` to the assets array if not present.
- [x] 1.5 Create `src/assets/i18n/en.json` — nested-by-feature structure, all ~280 English strings.
- [x] 1.6 Create `src/assets/i18n/es.json` — same structure, all ~280 Spanish strings.
- [x] 1.7 Modify `app-header.component.ts` — inject `TranslateService`; implement `setLanguage(lang)` that calls `translateService.use(lang)` and persists to `localStorage['pharmacy-lang']`.
- [x] 1.8 Modify `app-header.component.html` — add EN/ES toggle button alongside dark-mode toggle; bind to `setLanguage()`.
- [x] 1.9 Modify `app.component.ts` (or bootstrap) — on init, resolve language from `localStorage['pharmacy-lang']` → `navigator.language` → `'en'`; call `translateService.use()`.

---

## Phase 2: Shared + Auth + Catalog (→ PR 2)

- [ ] 2.1 Migrate `shared/` components (e.g., `confirm-dialog`, `page-header`, `status-badge`) — add `TranslatePipe` to imports; replace hardcoded strings with `| translate` keys from `en.json`.
- [ ] 2.2 Migrate `auth/` components (`login`, `unauthorized`) — pipe all labels and error messages; replace `TranslateService.instant()` calls where needed.
- [ ] 2.3 Migrate `catalog/` components (e.g., `product-list`, `product-form`, `category-form`) — pipe template strings; convert `typeOptions` arrays to getter methods returning translated labels via `TranslateService.instant()`.
- [ ] 2.4 Verify `[attr.label]` binding pattern is used for all PrimeNG attribute inputs in this slice (not `[label]`).

---

## Phase 3: Inventory + Sales (→ PR 3)

- [ ] 3.1 Migrate `inventory/` components (e.g., `stock-list`, `stock-adjustment`, `movement-history`) — pipe all template strings; add `movement-history.component.ts` TranslateService injection for dynamic strings.
- [ ] 3.2 Migrate `sales/` components (e.g., `sales-pos`, `cart`, `sales-history`) — pipe template strings; `sales-history.component.ts` uses `instant()` for dynamic column headers.
- [ ] 3.3 For each static option array in this slice, convert to a getter method returning `{ label: this.translate.instant('key'), value: ... }[]`.
- [ ] 3.4 Verify no `navigator.language` or raw `LOCALE_ID` references remain in inventory/sales modules.

---

## Phase 4: Reports + Users + Cleanup (→ PR 4)

- [ ] 4.1 Migrate `reports/` components — pipe all template strings; use `instant()` for chart labels and export column headers.
- [ ] 4.2 Migrate `users/` components (`user-list`, `user-form`, `profile`) — pipe all template strings.
- [ ] 4.3 Remove any remaining hardcoded Spanish strings across all 23 components (global search for literal `'Guardar'`, `'Cancelar'`, etc.).
- [ ] 4.4 Remove `LOCALE_ID` provider from any module-level or lazy-loaded providers if still present.
- [ ] 4.5 Verify `assets/i18n/en.json` and `es.json` have 1:1 key parity (no missing keys in either file).
- [ ] 4.6 Update `README.md` or inline developer docs with the `pharmacy-lang` localStorage key and resolution order.

---

## Phase 5: Testing / Verification

- [ ] 5.1 Unit test `translate.provider.ts` — verify `TranslateHttpLoader` is configured with `/assets/i18n/` base path.
- [ ] 5.2 Unit test `AppHeaderComponent` — `setLanguage('es')` calls `translateService.use('es')` and sets `localStorage['pharmacy-lang']`.
- [ ] 5.3 Unit test boot resolution — mock localStorage and `navigator.language`; verify `translateService.use()` is called with the correct priority order.
- [ ] 5.4 Component test (smoke) — for each migrated component, render with `TranslateTestingModule`; assert no raw hardcoded label strings appear in the DOM.
- [ ] 5.5 E2E / manual verification — switch EN → ES and ES → EN without page reload; reload page; confirm persisted language is restored.
