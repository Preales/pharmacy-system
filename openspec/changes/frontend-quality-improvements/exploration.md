## Exploration: frontend-quality-improvements

**Project**: pharmacy-system
**Date**: 2026-08-28
**Change name**: frontend-quality-improvements
**Scope**: `src/frontend/pharmacy-frontend/src/app`

---

### Current State

The Angular 19 frontend is organized into feature modules (`catalog`, `inventory`, `sales`, `reports`) each with a shell component acting as the layout/sidebar nav. It uses standalone components, PrimeNG, signals, and lazy-loaded routes. A partial constants file exists (`core/constants/app.constants.ts`). An i18n infrastructure is wired in `angular.json` but no components use `i18n` attributes. Both inline templates and external `.html` files coexist inconsistently. All 4 feature shells duplicate identical sidebar CSS. Currency `COP` is hardcoded as a string literal scattered across 9+ locations. The sidebar nav in each shell does not link all routes declared in the feature's route file.

---

### Issue 1 — Hardcoded Data in Components

**Confirmed**: Yes

**Details**:

- `'Active'` / `'Inactive'` status strings are repeated inline in `category-list`, `product-list`, `supplier-list` templates — instead of using the existing `AppStatus` constant from `app.constants.ts`.
- Pagination values `[rows]="10"`, `[rows]="20"`, `[rowsPerPageOptions]="[10, 20, 50]"`, `[rowsPerPageOptions]="[10, 25, 50]"` are duplicated across at least 6 list components with **inconsistent values** (`[10, 25, 50]` vs `[10, 20, 50]`).
- Low-stock threshold `10` is hardcoded in `product-list` template (`stockQuantity < 10`).
- `AppRoles` and `AppStatus` exist in `app.constants.ts` and `Pagination` is defined there too — but **not consistently imported** in components that need these values.
- `pageSize = 20` is duplicated as a local field in `product-list` and `conflict-alerts` instead of reading from `Pagination.DefaultPageSize`.

**Affected files**:
- `app/core/constants/app.constants.ts` — constants exist but are incomplete (missing: currency code, low-stock threshold)
- `app/features/catalog/categories/category-list.component.ts`
- `app/features/catalog/products/product-list.component.ts`
- `app/features/catalog/suppliers/supplier-list.component.ts`
- `app/features/inventory/containers/movement-history.component.ts`
- `app/features/inventory/containers/inventory-report.component.ts` (`[rows]="20"`)
- `app/features/sales/containers/conflict-alerts.component.ts`

**Effort**: S — Adding constants and updating import references is mechanical. No logic changes.

**Risks**: Low. Pure refactor, behavior unchanged. Risk of merge conflicts if multiple devs touch the same files simultaneously.

---

### Issue 2 — Centralize Styles

**Confirmed**: Yes — **severe duplication**

**Details**:

- 22 out of 27 `.component.ts` files contain inline `styles` blocks.
- All 4 shell components (`catalog-shell`, `inventory-shell`, `sales-shell`, `reports-shell`) contain **identical sidebar CSS** (~70 lines each): `.sidebar-header`, `.sidebar-nav`, `.nav-item`, `.nav-item:hover`, `.nav-item.active`, `.sidebar-footer`, `.logout-btn`, `.user-email`, `.{feature}-content`.
- The global `styles.scss` already defines shared utilities (`.page-header`, `.actions-bar`, `.form-body`, `.field`, `.status-badge`) but they are not used consistently — some components re-declare equivalent rules inline.
- Component-scoped styles that are legitimately local (e.g., `.filter-bar`, `.stock-low`) can stay inline; the problem is the duplicated cross-component patterns.

**Affected files**:
- `src/styles.scss` — needs sidebar token classes added
- `app/features/catalog/catalog-shell.component.ts`
- `app/features/inventory/inventory-shell.component.ts`
- `app/features/sales/sales-shell.component.ts`
- `app/features/reports/reports-shell.component.ts`
- `app/features/catalog/categories/category-list.component.ts`
- `app/features/catalog/products/product-list.component.ts`
- `app/features/catalog/suppliers/supplier-list.component.ts`
- (+ most other components with inline styles)

**Effort**: M — The sidebar duplication is mechanical but the shell refactor carries risk (visual regression). Extracting a shared `AppShellComponent` or a `_sidebar.scss` partial is the right approach. Non-shell inline styles are lower priority.

**Risks**: Medium. CSS specificity can shift when moving from encapsulated component styles to global. Manual visual testing required across all 4 shells.

---

### Issue 3 — Separate HTML Templates from .ts Files

**Confirmed**: Yes — 23 inline, 4 external

**Details**:

- 23 components use inline `` template: ` ... ` `` (backtick templates directly in the `@Component` decorator).
- 4 components already use `templateUrl`:
  - `pos.component.ts` → `pos.component.html`
  - `product-form.component.ts` → `product-form.component.html`
  - `sales-history.component.ts` → `sales-history.component.html`
  - `stock-list.component.ts` → `stock-list.component.html`
- The inconsistency is most impactful on large components: `catalog-shell` (~135 lines), `inventory-shell` (~141 lines), `sales-shell` (~145 lines), `product-list` (~231 lines), `sale-detail`, `inventory-dashboard`, `pos` (already external).

**Affected files** (priority candidates by size — inline templates over 50 template lines):
- `app/features/catalog/catalog-shell.component.ts`
- `app/features/inventory/inventory-shell.component.ts`
- `app/features/sales/sales-shell.component.ts`
- `app/features/catalog/products/product-list.component.ts`
- `app/features/catalog/categories/category-list.component.ts`
- `app/features/catalog/suppliers/supplier-list.component.ts`
- `app/features/sales/containers/sale-detail.component.ts`
- `app/features/inventory/containers/inventory-dashboard.component.ts`
- (remaining 15 inline files — smaller, lower urgency)

**Effort**: M — Mechanical file creation for each component. 23 extractions × ~5 min each = ~2h. Angular tooling supports this transparently (`templateUrl` is a drop-in replacement). No logic changes.

**Risks**: Low. Pure file split. IDE support (language services, Angular LSP) actually improves after extraction. Risk: forgetting to remove the `template:` key when adding `templateUrl:` — must not keep both.

---

### Issue 4 — i18n: Messages Files Exist But Are Not Used

**Confirmed**: Yes

**Details**:

- `angular.json` has a full i18n config: source locale `en`, Spanish locale `es` pointing to `src/locale/messages.es.xlf`, with a dedicated `es` build configuration.
- `@angular/localize/init` is already in `polyfills`.
- `src/locale/messages.es.xlf` exists but is **empty** — the `<body>` contains only comments explaining how to add translations.
- `src/locale/messages.xlf` (source) also exists.
- **Zero components** use `i18n` attributes or `$localize` tagged templates. `ng extract-i18n` would produce an empty extraction.
- The prompt mentions `messages.es.json` but the actual files are XLIFF (`.xlf`), which is the Angular default format. No JSON i18n files exist.

**Affected files**:
- All component templates (23 inline + 4 external `.html`) — none have `i18n` attributes
- `src/locale/messages.es.xlf` — empty, waiting for translations
- `angular.json` — infrastructure already correct

**Effort**: L — Tagging every user-visible string with `i18n="@@key"` across all 27 components, running `ng extract-i18n`, translating into Spanish, and verifying the `es` build. This is a full internationalization pass, not a quick fix.

**Risks**: High. i18n tagging can break template binding syntax if applied incorrectly to dynamic expressions. Interpolated strings (e.g., `"Delete product {{ name }}?"`) need ICU message format or `$localize`. Requires a Spanish translator for meaningful output.

---

### Issue 5 — Currency Type Must Be COP

**Confirmed**: COP is already used — but **hardcoded as a string literal in 9+ places**

**Details**:

The currency is correctly `COP` everywhere, but it is a raw string literal, not a constant:

| File | Occurrences |
|------|-------------|
| `product-list.component.ts` (inline template) | 2× `'COP'` |
| `sale-detail.component.ts` (inline template) | 3× `'COP'` |
| `sales-history.component.html` | 3× `'COP'` |
| `pos.component.html` | 5× `'COP'` |
| `product-form.component.html` | 2× `currency="COP"` |
| `ingress-form.component.ts` (inline template) | 1× `currency="COP"` |

There is no `AppCurrency` or equivalent constant. If the currency ever needs to change (e.g., multi-tenant, multi-country support), every file must be updated manually.

The `currency` pipe format string `'COP':'symbol':'1.0-0'` is also duplicated verbatim — a custom pipe or a shared token would centralize it.

**Affected files**:
- `app/core/constants/app.constants.ts` — add `AppCurrency` constant here
- `app/features/catalog/products/product-list.component.ts`
- `app/features/catalog/products/product-form.component.html`
- `app/features/inventory/components/ingress-form.component.ts`
- `app/features/sales/containers/sale-detail.component.ts`
- `app/features/sales/containers/sales-history.component.html`
- `app/features/sales/containers/pos.component.html`

**Effort**: S — Add one constant, update 7 files. The pipe format string could be wrapped in a custom `CopCurrencyPipe` for full centralization (optional, M effort).

**Risks**: Low. If a pipe is introduced, all templates must import it. The constant approach alone is minimal risk.

---

### Issue 6 — Navigation Menu Shows Partial Sections

**Confirmed**: Yes — with one structural finding

**Details**:

Each feature has its own isolated shell with a sidebar. There is **no top-level application navigation** linking between features (Catalog, Inventory, Sales, Reports). A user inside the Catalog shell sees only Catalog nav items; there is no way to navigate to Inventory or Sales from the sidebar.

**Per-feature nav vs. routes comparison**:

| Feature | Routes defined | Nav items in shell |
|---------|---------------|-------------------|
| Catalog | `products`, `categories`, `suppliers` | ✅ All 3 shown |
| Inventory | `dashboard`, `stock`, `movements`, `low-stock` | ✅ All 4 shown |
| Sales | `pos`, `history`, `:id` (detail), `conflict-alerts` | ✅ 3 shown (`pos`, `history`, `conflict-alerts`); `:id` is a dynamic detail route, correctly excluded from nav |
| Reports | `dashboard`, `sales`, `inventory` | ✅ All 3 shown |

**Finding**: Within each feature, all routable sections ARE visible in the nav. The `:id` route in Sales is a drill-down detail (not a nav item), which is correct. The real gap is the **absence of inter-feature navigation**: once inside a feature shell, there is no way to jump to another feature without editing the URL manually.

The `app.routes.ts` defines 5 top-level routes (`auth`, `catalog`, `inventory`, `sales`, `reports`, `unauthorized`) but there is no `AppShellComponent` with a global nav that wraps all authenticated sections.

**Affected files**:
- `app/app.component.ts` — currently a thin shell with no nav
- `app/app.routes.ts` — authenticated routes are peers, not children of a shared layout
- All 4 feature shell components — each owns its own sidebar independently

**Effort**: M — A proper fix requires introducing a shared `AppShellComponent` with a top-level sidebar/navbar that wraps all authenticated routes, then refactoring the 4 feature shells to remove their standalone sidebars (or keep them as secondary navs). This is an architectural change.

**Risks**: Medium. Route restructuring (nesting all authenticated routes under an `AppShellComponent`) requires updating `app.routes.ts` and verifying all lazy-loaded guards still fire correctly. Auth guard must remain on authenticated routes.

---

### Affected Areas Summary

| Path | Issues |
|------|--------|
| `src/styles.scss` | #2 |
| `app/core/constants/app.constants.ts` | #1, #5 |
| `app/app.component.ts` | #6 |
| `app/app.routes.ts` | #6 |
| `app/features/catalog/catalog-shell.component.ts` | #2, #3, #6 |
| `app/features/inventory/inventory-shell.component.ts` | #2, #3, #6 |
| `app/features/sales/sales-shell.component.ts` | #2, #3, #6 |
| `app/features/reports/reports-shell.component.ts` | #2, #3, #6 |
| `app/features/catalog/products/product-list.component.ts` | #1, #3, #5 |
| `app/features/catalog/products/product-form.component.html` | #5 |
| `app/features/catalog/categories/category-list.component.ts` | #1, #3 |
| `app/features/catalog/suppliers/supplier-list.component.ts` | #1, #3 |
| `app/features/inventory/components/ingress-form.component.ts` | #3, #5 |
| `app/features/inventory/containers/inventory-dashboard.component.ts` | #3 |
| `app/features/inventory/containers/movement-history.component.ts` | #1, #3 |
| `app/features/inventory/containers/inventory-report.component.ts` | #1, #3 |
| `app/features/sales/containers/sale-detail.component.ts` | #3, #5 |
| `app/features/sales/containers/sales-history.component.html` | #5 |
| `app/features/sales/containers/pos.component.html` | #5 |
| `app/features/sales/containers/conflict-alerts.component.ts` | #1, #3 |
| `src/locale/messages.es.xlf` | #4 |
| All 27 component templates | #4 |

---

### Approaches

#### Issues #1 and #5 (Constants + Currency) — Combined approach
1. **Extend `app.constants.ts`** — Add `AppCurrency`, `LowStockThreshold`, normalize pagination options. Update all import sites.
   - Pros: Zero new files, consistent with existing pattern, minimal diff.
   - Cons: Still requires importing constants in templates (not possible for Angular pipes directly).
   - Effort: S

#### Issue #2 (Centralize Styles)
1. **Extract sidebar styles to `styles.scss` partial** — Move the duplicated sidebar CSS to a `_sidebar.scss` and `@use` it in `styles.scss`. Shell components drop their inline `styles:` for the shared portions.
   - Pros: Single source of truth, works with Angular's global styles.
   - Cons: Loses Angular's View Encapsulation for those rules — must use global class names carefully.
   - Effort: M

2. **Create a shared `AppSidebarComponent`** — Extract sidebar markup + styles into a reusable component used by all 4 shells.
   - Pros: Full encapsulation, easier to evolve nav structure (also fixes #6 partially).
   - Cons: Higher effort, requires Input for section title/icon/nav items.
   - Effort: M–L (but solves #2 and #6 together)

#### Issue #3 (External Templates)
1. **Mechanical extraction** — For each inline component, create a `.component.html` file, move the template content, replace `template:` with `templateUrl:`.
   - Pros: Straightforward, no logic changes, IDE support improves.
   - Effort: M (23 files)

#### Issue #4 (i18n)
1. **Tag templates incrementally** — Start with high-visibility strings, run `ng extract-i18n`, populate `messages.es.xlf`.
   - Pros: Progressive, can ship partial i18n.
   - Cons: Large surface area, requires translator.
   - Effort: L

#### Issue #6 (Global Navigation)
1. **Introduce `AppShellComponent`** — Create a top-level authenticated layout component that wraps all feature routes. Contains top nav or sidebar with links to all 4 sections. Feature shells become inner content layouts.
   - Pros: Solves the cross-feature navigation gap completely.
   - Cons: Route restructuring, risk of breaking auth guards.
   - Effort: M

---

### Recommendation

Tackle in this order:

1. **#1 + #5 (S)** — Extend constants, fix hardcoded values. Zero risk, immediate win.
2. **#3 (M)** — Extract all inline templates. No logic changes, improves maintainability for all subsequent work.
3. **#2 (M)** — Centralize sidebar styles via a shared `AppSidebarComponent` (also lays groundwork for #6).
4. **#6 (M)** — Introduce `AppShellComponent` for global navigation, using the sidebar component from #2.
5. **#4 (L)** — i18n tagging pass. Do last — benefits from all templates being external (easier to scan `.html` files).

---

### Risks Summary

| Issue | Risk | Notes |
|-------|------|-------|
| #1 Constants | Low | Pure refactor |
| #2 Styles | Medium | CSS specificity, visual regression possible |
| #3 Templates | Low | Mechanical split, Angular supports it natively |
| #4 i18n | High | Large surface, translator required, ICU complexity |
| #5 Currency | Low | Small constant addition |
| #6 Navigation | Medium | Route restructuring, guard re-verification |

---

### Ready for Proposal

**Yes** — Issues #1, #3, and #5 are ready to propose immediately. Issues #2 and #6 should be proposed together (shared sidebar component). Issue #4 (i18n) needs a scope decision first: full i18n pass or just infrastructure validation?
