# Exploration: runtime-i18n — ngx-translate for Angular 19 Pharmacy Frontend

## Current State

Angular compile-time i18n is wired in `angular.json`:
- `sourceLocale: "en"`, `locales.es` pointing to `src/locale/messages.es.xlf`
- `@angular/localize` is present in `package.json`
- `messages.es.xlf` is **empty** — infrastructure exists, zero translations done

`app.config.ts` has no i18n provider. No `HttpClient` loader for translations is configured. Language switching at runtime is structurally impossible with the current compile-time approach (it requires separate builds per locale).

The app is **100% English hardcoded** across templates — either in `.html` files or inline `template` strings inside `.ts` files.

**`@ngx-translate/core` is NOT in `package.json`** — must be installed.

---

## Affected Areas

### Infrastructure
- `src/frontend/pharmacy-frontend/package.json` — add `@ngx-translate/core` and `@ngx-translate/http-loader`
- `src/frontend/pharmacy-frontend/src/app/app.config.ts` — add `provideHttpClient` (already present), add `TranslateModule.forRoot()` provider / `importProvidersFrom`
- `src/frontend/pharmacy-frontend/angular.json` — remove or leave compile-time i18n config (can coexist; compile-time locale should be removed to avoid build collision)
- `src/frontend/pharmacy-frontend/src/assets/i18n/en.json` — new file (English strings)
- `src/frontend/pharmacy-frontend/src/assets/i18n/es.json` — new file (Spanish strings)

### Shared / Shell
- `src/app/shared/components/app-header/app-header.component.html` — add language toggle button (EN/ES switcher alongside dark mode toggle); aria-labels need translation
- `src/app/shared/components/app-sidebar/app-sidebar.component.html` — nav labels, aria-labels, button titles
- `src/app/shared/components/app-shell/app-shell.component.html` — no visible strings (structural only, no changes needed)

### Auth
- `src/app/features/auth/login.component.ts` (inline template) — page header, subtitle, labels, placeholders, error messages, button labels

### Catalog
- `src/app/features/catalog/products/product-list.component.ts` — page header, column headers, button labels, toast messages, confirm dialog messages
- `src/app/features/catalog/products/product-form.component.html` — dialog header, field labels, placeholders, validation messages, button labels
- `src/app/features/catalog/categories/category-list.component.ts` — page header, column headers, empty state, toast/confirm messages
- `src/app/features/catalog/categories/category-form.component.ts` — dialog header, field labels, placeholders, validation messages, button labels
- `src/app/features/catalog/suppliers/supplier-list.component.ts` — page header, column headers, empty state, toast/confirm messages
- `src/app/features/catalog/suppliers/supplier-form.component.ts` — dialog header, field labels, placeholders, validation messages, button labels

### Inventory
- `src/app/features/inventory/containers/stock-list.component.html` — page header, column headers, button labels, tooltips, empty state, search placeholder
- `src/app/features/inventory/containers/movement-history.component.ts` — page header, column headers, back button, empty state, type filter options
- `src/app/features/inventory/containers/low-stock.component.ts` — page header, badge text, column headers, tooltips, empty state
- `src/app/features/inventory/containers/inventory-dashboard.component.ts` — (not inspected inline; likely has strings)
- `src/app/features/inventory/components/ingress-form.component.ts` — dialog header, field labels, placeholders, validation messages, button labels
- `src/app/features/inventory/components/adjustment-form.component.ts` — dialog header, field labels, placeholders, validation messages, hint text

### Sales
- `src/app/features/sales/containers/pos.component.html` — offline banner, cart header, customer label, button labels, stock badge, empty states
- `src/app/features/sales/containers/sales-history.component.html` — page header, column headers, filter placeholders, dialog content, button labels
- `src/app/features/sales/containers/sale-detail.component.ts` — receipt labels, meta labels, dialog content, button labels, table headers
- `src/app/features/sales/containers/conflict-alerts.component.ts` — page header, column headers, toggle label, button labels, empty state

### Reports
- `src/app/features/reports/containers/reports-dashboard.component.ts` — KPI card labels, table headers, "View →" links, empty state
- `src/app/features/reports/containers/sales-report.component.ts` — report header, date filter labels, KPI card labels, chart card headers, table headers, button label
- `src/app/features/reports/containers/inventory-report.component.ts` — KPI card labels, table headers, card header, tag values, empty state

### Users
- `src/app/features/users/containers/user-list.component.ts` — page header, column headers, tooltips, confirm dialog messages, toast messages
- `src/app/features/users/components/user-form.component.ts` — dialog headers, field labels, placeholders, validation messages, button labels, change-role info text

---

## String Inventory by Feature

| Feature | Templates/Files | Estimated Strings | Effort |
|---|---|---|---|
| shared (header, sidebar) | 2 | ~12 | Low |
| auth (login) | 1 inline | ~18 | Low |
| catalog (products, categories, suppliers) | 6 | ~70 | Medium |
| inventory (stock-list, movement-history, low-stock, ingress-form, adjustment-form) | 5 | ~65 | Medium |
| sales (pos, sales-history, conflict-alerts, sale-detail) | 4 | ~55 | Medium |
| reports (dashboard, sales-report, inventory-report) | 3 | ~30 | Low–Med |
| users (user-list, user-form) | 2 | ~30 | Low–Med |
| **Total** | **23** | **~280** | **Medium overall** |

> Note: "strings" includes labels, placeholders, column headers, validation messages, toast messages, button labels, tooltips, aria-labels, and dialog content. Toast messages and `ConfirmationService` calls inside `.ts` logic are also affected (not just templates).

---

## Key Technical Findings

1. **Most components use inline templates** — only 7 files have `.html` files; 26 components use `template: \`...\`` inside `.ts`. The `TranslatePipe` (`| translate`) must be imported in every component's `imports[]` array. This is the dominant migration cost.

2. **Toast and ConfirmDialog strings live in TypeScript logic** (e.g., `messageService.add({ detail: 'Product saved.' })`). These require `TranslateService.instant()` injection, adding a service dependency to ~15 components.

3. **`app-header` is the natural home for the language toggle** — it already has the dark mode button and `themeService`. A `LanguageService` (or inline signal) with `TranslateService.use()` is the right pattern.

4. **Angular compile-time i18n must be disabled** — having both systems active causes a build conflict. The `i18n` block in `angular.json` and `@angular/localize` import in `main.ts` should be removed.

5. **HttpClient is already provided** in `app.config.ts` — `TranslateHttpLoader` can be wired without additional setup.

6. **PrimeNG components** (`p-button label=`, `pTooltip=`, `placeholder=`, dialog `header=`) use attribute bindings — they need to become `[label]="'key' | translate"` or bound expressions. This is mechanical but verbose.

7. **`typeOptions` arrays** (e.g., movement-history, sales-history status) are defined as static TS objects with English string values — these need to be either replaced with translated keys or built dynamically using `TranslateService`.

---

## Approaches

### 1. Full ngx-translate Migration (Recommended)
Install `@ngx-translate/core` + `@ngx-translate/http-loader`. Wire `TranslateModule.forRoot()` in `app.config.ts`. Create `en.json` + `es.json` in `src/assets/i18n/`. Add `TranslatePipe` to every component's imports. Replace hardcoded strings with `| translate` in templates and `translateService.instant()` in TypeScript. Add `LanguageService` and language toggle to `AppHeaderComponent`.

- **Pros**: Full runtime switching, no build-per-locale, standard community library, well-documented, supports lazy-loading translation files per feature
- **Cons**: ~23 component files to touch; toast/confirm strings require service injection; mechanical but large scope
- **Effort**: Medium (3–5 dev-days for a thorough implementation)

### 2. Partial Migration (Header Toggle + Template Strings Only)
Translate only visible template strings, skip TypeScript toast/confirm messages for now.

- **Pros**: Lower scope, faster to ship
- **Cons**: Inconsistent UX — error toasts and confirm dialogs remain English; tech debt immediately
- **Effort**: Low–Medium (2–3 dev-days)

### 3. Keep Compile-time i18n, Populate messages.es.xlf
Extract strings with `ng extract-i18n`, populate `messages.es.xlf`, build two locale outputs.

- **Pros**: Zero new dependencies, Angular-native
- **Cons**: No runtime switching — requires page reload or separate deployments; poor UX; `messages.es.xlf` still needs all strings; non-standard for SPAs
- **Effort**: Medium (but solves a different, worse problem)

---

## Recommendation

**Approach 1 — Full ngx-translate Migration.**

The scope is well-defined and entirely mechanical. The pattern is consistent across all 23 files. The `TranslatePipe` import per component is the main repetition cost but is straightforward given the standalone component architecture.

Suggested task breakdown:
1. Install packages + wire `app.config.ts` + create `LanguageService` + add language toggle to `AppHeaderComponent`
2. Create `en.json` + `es.json` with all ~280 strings
3. Migrate shared and auth components (quick wins, establishes the pattern)
4. Migrate catalog (6 files, ~70 strings)
5. Migrate inventory (5 files, ~65 strings)
6. Migrate sales (4 files, ~55 strings)
7. Migrate reports + users (5 files, ~60 strings)
8. Remove compile-time i18n from `angular.json`

---

## Risks

- **Inline template verbosity**: `[label]="'key' | translate"` is significantly more verbose than `label="Text"`. Review will be noisy.
- **Missing translations at runtime**: If a key is missing from `es.json`, ngx-translate falls back to the key string (e.g., `catalog.products.title`) — not ideal but not a crash. Fallback language should be set to `'en'`.
- **TypeScript injection in 15+ components**: `TranslateService` must be injected for toast/confirm strings. This is mechanical but easy to miss.
- **`typeOptions` static arrays**: Arrays like `[{ label: 'Ingress', value: 'Ingress' }]` must be rebuilt as computed signals or methods referencing translated strings if language can change at runtime without page reload.
- **PrimeNG `header=` on `<p-dialog>`**: Uses a string input (not template), so it needs `[header]="'key' | translate"` binding. This is already the pattern used in the codebase (e.g., `[header]="editTarget ? 'Edit Product' : 'New Product'"`).

---

## Ready for Proposal

**Yes.** The codebase is fully explored. The approach is clear, the scope is bounded, and the risk profile is low-to-medium. The proposal can proceed with Approach 1 as the implementation target.
