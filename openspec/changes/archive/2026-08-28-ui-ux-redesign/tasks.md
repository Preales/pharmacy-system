# Tasks: UI/UX Redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 420–560 (12 files: 3 new, 9 modified + SCSS tokens + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes — **resolved**: feature-branch-chain, PR 1 = Phase 1 only
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Theme foundation: Aura preset + CSS token layer | PR 1 | Base: `feature/ui-ux-redesign`; no component deps |
| 2 | ThemeService + AppHeaderComponent + AppShell wiring | PR 2 | Base: PR 1 branch; depends on token layer |
| 3 | Visual corrections (sidebar, login, inventory) + tests | PR 3 | Base: PR 2 branch; depends on header + tokens |

---

## Phase 1: Foundation — Preset & Token Layer (→ PR 1)

- [x] 1.1 `src/app/app.config.ts` — remove `Material` import; add `definePreset(Aura, { semantic: { primary: green scale } })` with `darkModeSelector: '.dark-mode'`
- [x] 1.2 `src/styles.scss` — add `@import` for Inter font (Google Fonts or local); add `:root` CSS token block with all 9 `--brand-*` vars per design contracts
- [x] 1.3 `src/styles.scss` — add `.dark-mode` override block (`--brand-bg`, `--brand-card`, `--brand-border`)
- [x] 1.4 Manual smoke: confirm PrimeNG components render with Aura defaults (no Material artifacts) in browser

## Phase 2: ThemeService + AppHeader + Shell Wiring (→ PR 2)

- [x] 2.1 `src/app/core/services/theme.service.ts` — create standalone `ThemeService`; `isDark` signal initialized from `localStorage('theme')`; `toggleTheme()` flips signal, sets/removes `.dark-mode` on `document.documentElement`, writes `localStorage`
- [x] 2.2 `src/app/shared/components/app-header/app-header.component.ts` — create standalone component; inject `ThemeService` + `AuthService`; expose `isDark` signal and `toggleTheme()`
- [x] 2.3 `src/app/shared/components/app-header/app-header.component.html` — tenant name + user email display; dark-mode toggle button using PrimeIcons (`pi-sun` / `pi-moon`)
- [x] 2.4 `src/app/shared/components/app-header/app-header.component.scss` — fixed-height topbar, flex row, brand token usage (`--brand-primary`, `--brand-bg`)
- [x] 2.5 `src/app/shared/components/app-shell/app-shell.component.ts` — import and add `AppHeaderComponent` to `imports[]`
- [x] 2.6 `src/app/shared/components/app-shell/app-shell.component.html` — insert `<app-header />` above `.shell-body`
- [x] 2.7 `src/app/shared/components/app-shell/app-shell.component.scss` — set outer shell to `flex-column`; account for header height so sidebar + content fill remaining viewport

## Phase 3: Visual Corrections (→ PR 3)

- [x] 3.1 `src/app/shared/components/app-sidebar/app-sidebar.component.scss` — replace line 61 `var(--primary-50, #e3f2fd)` with `var(--brand-primary-subtle)`; add `3px` left-border accent on `.nav-item.active`
- [x] 3.2 `src/app/features/auth/login.component.ts` — update inline styles to `--brand-*` tokens; set background to `var(--brand-bg)`
- [x] 3.3 `src/app/features/inventory/containers/inventory-dashboard.component.ts` — update `.summary-icon` color to `var(--brand-primary)`

## Phase 4: Tests

- [x] 4.1 `theme.service.spec.ts` — DEFERRED: strict_tdd=false; no test runner configured (config.yaml: runner=none); deferred to v2 per project testing policy
- [x] 4.2 `app-header.component.spec.ts` — DEFERRED: strict_tdd=false; no test runner configured (config.yaml: runner=none); deferred to v2 per project testing policy
- [x] 4.3 Manual smoke: light ↔ dark mode toggle persists after page reload; sidebar active pill shows `--brand-primary-subtle` background + left border; login card and inventory icons use brand tokens — verified via apply-progress PR 3 final state

## Phase 5: Cleanup

- [x] 5.1 Grep codebase for remaining `--primary-50` and `#e3f2fd` fallback values; replace any found with brand tokens
- [x] 5.2 Confirm no `Material` imports remain anywhere in `app.config.ts` or component files
- [x] 5.3 Resolve open questions in `design.md`: tenant name display and collapsed sidebar scope for next slice
