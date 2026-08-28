# Design: Frontend Quality Improvements

## Technical Approach

Four sequential waves of pure refactoring on the Angular 19 standalone frontend (`src/frontend/pharmacy-frontend`). No new npm dependencies. Each wave is independently compilable and ships as its own PR. Wave order is load-bearing: constants must exist before templates reference them; external templates must exist before i18n tagging.

---

## Architecture Decisions

| # | Option | Tradeoff | Decision |
|---|--------|----------|----------|
| W1 | `as const` objects vs TypeScript `enum` | `enum` compiles to IIFE runtime object; `as const` is tree-shakeable, no runtime overhead | Keep `as const` pattern — already used by `AppRoles`/`AppStatus` |
| W1 | Add `CURRENCY_CODE` constant vs rename existing key | Spec names key `AppCurrency.COP`; adding a new export is non-breaking | Add `export const AppCurrency = { COP: 'COP' } as const` |
| W3 | `Input`-driven nav items vs hardcoded HTML in `AppSidebarComponent` | Input array allows future dynamic menus; hardcoded is simpler for now | Hardcoded nav items — no dynamic menus in scope; simpler template, no `@Input` contract to maintain |
| W3 | `AppShellComponent` in `shared/components/` vs `core/components/` | Shell is a layout concern, not a domain service — `shared/` is correct per existing project structure | `src/app/shared/components/app-shell/` and `app-sidebar/` |
| W3 | Auth guard at shell level vs per-child route | Spec requires guard at `AppShellComponent` level; current pattern has `canActivate` per feature root | Move `canActivate: [authGuard]` to shell parent route; remove per-feature duplicate guards |
| W4 | `LOCALE_ID` via `app.config.ts` provider vs `angular.json` only | `angular.json` controls the build locale; `LOCALE_ID` provider controls runtime pipes — both needed | Provide `{ provide: LOCALE_ID, useValue: 'es-CO' }` in `appConfig` + `angular.json` already has `es` locale wired |

---

## Data Flow

### Wave 3 — Route and Layout Restructuring

```
app.routes.ts
  ├── /auth          → AuthRoutes          (no shell, no guard)
  ├── /unauthorized  → UnauthorizedComponent (no shell, no guard)
  └── /             → AppShellComponent [canActivate: authGuard]
        ├── catalog  → CatalogRoutes
        ├── inventory → InventoryRoutes
        ├── sales    → SalesRoutes
        └── reports  → ReportsRoutes [canActivate: roleGuard]

AppShellComponent renders:
  <app-sidebar />          ← global inter-feature nav + logout
  <router-outlet />        ← feature content
```

Each feature shell (`*-shell.component`) keeps its own `<router-outlet>` for intra-feature navigation but drops its sidebar nav and CSS. `AppSidebarComponent` holds the single sidebar.

---

## File Changes

### Wave 1 — Constants

| File | Action | Description |
|------|--------|-------------|
| `src/app/core/constants/app.constants.ts` | Modify | Add `AppCurrency`, `LowStockThreshold`; update `Pagination.PageSizeOptions` to `[10, 25, 50]` |
| `src/app/features/inventory/containers/low-stock.component.ts` | Modify | Import `LowStockThreshold` |
| `src/app/features/catalog/products/product-list.component.ts` | Modify | Import `Pagination` options |
| `src/app/features/inventory/containers/stock-list.component.ts` | Modify | Import `Pagination` options |
| `src/app/features/sales/containers/pos.component.ts` | Modify | Import `AppCurrency.COP` |
| `src/app/features/reports/containers/sales-report.component.ts` | Modify | Import `AppCurrency.COP` |
| `src/app/features/reports/containers/inventory-report.component.ts` | Modify | Import `AppCurrency.COP` |

### Wave 2 — Template Extraction (23 files — representative list)

| File | Action | Description |
|------|--------|-------------|
| `src/app/app.component.html` | Create | Extracted from `app.component.ts` |
| `src/app/features/catalog/catalog-shell.component.html` | Create | Extracted from shell |
| `src/app/features/inventory/inventory-shell.component.html` | Create | Extracted from shell |
| `src/app/features/sales/sales-shell.component.html` | Create | Extracted from shell |
| `src/app/features/reports/reports-shell.component.html` | Create | Extracted from shell |
| *(19 remaining container/component `.html` files)* | Create | One per `.component.ts` with inline `template:` |
| All 23 `.component.ts` files above | Modify | Replace `template: \`...\`` with `templateUrl: './name.component.html'` |

### Wave 3 — Shell Refactor

| File | Action | Description |
|------|--------|-------------|
| `src/app/shared/components/app-sidebar/app-sidebar.component.ts` | Create | Shared sidebar: global feature nav + logout |
| `src/app/shared/components/app-sidebar/app-sidebar.component.html` | Create | Sidebar template |
| `src/app/shared/components/app-sidebar/app-sidebar.component.scss` | Create | Single source of sidebar CSS |
| `src/app/shared/components/app-shell/app-shell.component.ts` | Create | Authenticated layout host |
| `src/app/shared/components/app-shell/app-shell.component.html` | Create | Layout: `<app-sidebar>` + `<router-outlet>` |
| `src/app/shared/components/app-shell/app-shell.component.scss` | Create | Layout styles (flex container) |
| `src/app/app.routes.ts` | Modify | Nest authenticated routes under `AppShellComponent`; move `canActivate` to shell |
| `src/app/features/catalog/catalog-shell.component.ts` | Modify | Remove sidebar markup, CSS, AuthService injection |
| `src/app/features/inventory/inventory-shell.component.ts` | Modify | Same as above |
| `src/app/features/sales/sales-shell.component.ts` | Modify | Same + keep `SyncStatusBarComponent` in its own content area |
| `src/app/features/reports/reports-shell.component.ts` | Modify | Same |
| `src/styles.scss` | Modify | Remove superseded global sidebar CSS if any |

### Wave 4 — i18n

| File | Action | Description |
|------|--------|-------------|
| All 27 `.component.html` files | Modify | Add `i18n="@@key"` to every user-visible string |
| `src/locale/messages.xlf` | Modify | Regenerated by `ng extract-i18n` |
| `src/locale/messages.es.xlf` | Modify | All `<target>` elements populated with Spanish translations |
| `src/app/app.config.ts` | Modify | Add `{ provide: LOCALE_ID, useValue: 'es-CO' }` + `registerLocaleData(localeEsCO)` |

---

## Interfaces / Contracts

```typescript
// app.constants.ts additions
export const AppCurrency = { COP: 'COP' } as const;
export const LowStockThreshold = 10;
// Pagination.PageSizeOptions updated: [10, 25, 50]

// AppSidebarComponent — no @Input, hardcoded nav items
// Nav structure (absolute router paths):
const NAV_LINKS = [
  { path: '/catalog',   icon: 'pi-box',       label: 'Catalog' },
  { path: '/inventory', icon: 'pi-warehouse',  label: 'Inventory' },
  { path: '/sales',     icon: 'pi-shopping-cart', label: 'Sales' },
  { path: '/reports',   icon: 'pi-chart-bar',  label: 'Reports' },
];
// Uses routerLinkActive="active" with absolute paths (required after shell nesting)
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Build | `ng build` passes after each wave | CI `ng build` on each wave PR |
| Build | `ng build --localize` passes after Wave 4 | CI with `--localize` flag |
| Manual | Auth guard redirects unauthenticated users | Dev smoke test Wave 3 |
| Manual | Sidebar visible + all nav links work across all 4 shells | Visual smoke test Wave 3 |
| Manual | Currency displays `es-CO` format in `es` build | Dev smoke test Wave 4 |

---

## Migration / Rollout

Each wave is its own PR targeting the feature branch `feat/frontend-quality-improvements`. PRs are sequential (Wave N+1 targets Wave N's merged branch). No data migration. No feature flags required.

Wave 3 note: after nesting routes under `AppShellComponent`, all `routerLink` values inside feature shells that currently use relative paths (e.g., `routerLink="products"`) remain relative to their feature route and are unaffected. The global `AppSidebarComponent` uses **absolute** paths (`/catalog`, `/inventory`, etc.).

---

## Open Questions

- [ ] `SyncStatusBarComponent` in `sales-shell` — should it move to `AppShellComponent` (global) or stay in sales content area? Needs product decision before Wave 3 impl.
- [ ] `roleGuard` on `/reports` currently passes `data: { roles: [...] }` at route level — confirm whether this data survives after nesting under shell parent.
