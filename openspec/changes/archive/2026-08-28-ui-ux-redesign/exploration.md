# Exploration: UI/UX Redesign — Angular 19 Pharmacy Frontend

## Current State

### 1. styles.scss — Global Styles

**Current state:**
- Imports `primeicons/primeicons.css` via `@use`
- Delegates ALL color/font to PrimeNG CSS variables: `--font-family`, `--surface-ground`, `--text-color`
- Provides minimal layout utilities: `.page-header`, `.actions-bar`, `.form-body`, `.field`, `.status-badge`
- Status badge uses `--green-50/700` and `--red-50/700` (PrimeNG palette vars)
- **No custom CSS variables defined** — zero tokens for the design system
- **No Google Fonts import** — Inter font is not loaded anywhere (index.html has no `<link>`, styles.scss has no `@import`)
- **No dark mode styles** — only `--surface-ground` which PrimeNG manages via Material preset

**Gap vs design system:**
- Must add Inter font load in `index.html` or `styles.scss`
- Must define a CSS custom-property token layer: `--color-primary`, `--color-secondary`, `--color-accent`, `--bg-light`, `--bg-dark`, `--card-bg`, `--border-color`, `--color-destructive`, etc.
- Transition value `150-200ms` is partially present (sidebar has `0.15s`; POS has `0.15s`) but not a global token

**Effort: S** — add token definitions and Inter font import

---

### 2. PrimeNG Theme

**Current state:**
- Package: `primeng@19.1.4` + `@primeng/themes@19.1.4`
- Theme: **Material** preset (`import Material from '@primeng/themes/material'`) — the Material Design theme, NOT Aura or Lara
- Configured in `app.config.ts` via `providePrimeNG({ theme: { preset: Material, options: { darkModeSelector: '.dark-mode' } } })`
- No theme customization object — using Material defaults 100%
- Primary color is whatever Material preset uses (blue/purple tones), NOT pharmacy green `#15803D`
- Dark mode selector set to `.dark-mode` CSS class on a parent element, but **no code toggles this class** anywhere in the app

**Gap vs design system:**
- Must switch preset to **Aura** (flat/SaaS-appropriate) or customize Material with design tokens
- Must override `primary` palette to `#15803D`, `secondary` to `#22C55E`, CTA/accent buttons to `#0369A1`
- The `.dark-mode` hook exists but is wired to nothing — no toggle button, no service, no persistence

**Effort: M** — theme object override + toggle service

---

### 3. AppSidebarComponent — Structure & Styles

**Current state:**
- Template: logo icon (`pi-heart`) + app name, nav list with `@for`, footer with user email + logout
- Fixed width: `220px`, background `var(--surface-card)`, border-right `var(--surface-border)`
- Active state: `background: var(--primary-50, #e3f2fd)` — hardcoded fallback is Material blue (`#e3f2fd`), not pharmacy green
- `nav-item` has `border-radius: 0` — no rounded active pill
- No dark mode special handling beyond PrimeNG variable inheritance
- `pi-heart` icon for the app — generic, not pharmacy-branded
- No collapse/expand mechanic (always full-width)
- No visual separator between main nav and footer

**Gap vs design system:**
- Active item should use green tones (`#F0FDF4` bg, `#15803D` text/left-border accent) not blue
- Nav items should have `border-radius: 6px` inside `margin: 0 0.5rem` for the SaaS pill look
- Logo should ideally use a pharmacy SVG, not `pi-heart`
- Transitions: already `0.15s` — compliant
- No Inter font explicitly applied (relies on PrimeNG to set `--font-family`)

**Effort: S** — CSS-only changes, no logic changes needed

---

### 4. AppShellComponent — Layout Structure

**Current state:**
- Minimal: flex row with sidebar + `.shell-body` (flex column: sync bar + `<main>`)
- `shell-content`: `padding: 1.5rem`, `background: var(--surface-ground)`, `overflow: auto`
- SyncStatusBar sits between sidebar and `<main>` — renders inside `.shell-body` above the route content
- No top header / toolbar area — pages render their own `<h2>` via `.page-header`
- No breadcrumb area
- No page-level dark mode toggle button placement

**Gap vs design system:**
- Missing a top header bar component for: dark mode toggle, user info, page title/breadcrumb
- `shell-content` padding is fine (1.5rem)
- Background will be correct once PrimeNG primary color tokens are overridden

**Effort: M** — add header bar component with dark mode toggle

---

### 5. Dark Mode — Current Implementation

**Current state:**
- `app.config.ts`: `darkModeSelector: '.dark-mode'` — PrimeNG will apply dark tokens when `.dark-mode` is on a parent element
- **Nothing toggles this class.** No button, no service, no localStorage persistence
- Result: dark mode is configured in PrimeNG but completely non-functional for the user

**Gap vs design system:**
- Need a `ThemeService` (or inline in a component) that:
  - Reads `localStorage` preference on startup
  - Toggles `.dark-mode` class on `<html>` or `<body>`
  - Exposes a signal for the toggle button to bind to
- Need a toggle button in the shell header (or sidebar footer)
- Need to verify `--surface-ground` in dark mode maps to a dark background (PrimeNG Material dark should handle this once class is applied)

**Effort: S** — one small service + one button in shell header

---

### 6. Colors & Fonts — How Currently Applied

| Layer | Mechanism | Notes |
|-------|-----------|-------|
| Colors | PrimeNG CSS vars (`--surface-card`, `--primary-color`, `--text-color`) | Works but primary is Material blue |
| Font family | `var(--font-family)` on `html,body` | PrimeNG Material sets this to Roboto-like; Inter never loaded |
| Feature-level styles | Inline `styles:` in component TS files | Login, POS, Sync bar all use inline styles |
| Hardcoded fallbacks | e.g. `var(--primary-50, #e3f2fd)` | Fallback is Material blue — will show incorrectly if var not resolved |
| Tailwind-like classes | Used in reports dashboard: `text-primary`, `text-green-500`, `grid grid-cols-1` | PrimeNG 19 includes a utility layer — inconsistent with other features |
| Transition values | `0.15s` present in sidebar + POS | Compliant with 150ms target |

**Key problem:** No single source of truth for brand colors. Each component relies on PrimeNG variables that currently resolve to Material Design defaults (blue-grey palette), not pharmacy green.

---

## Affected Areas

| File | Why affected | Effort |
|------|-------------|--------|
| `src/index.html` | Add Inter Google Fonts link | XS |
| `src/styles.scss` | Add design token CSS variables, global typography rules | S |
| `src/app/app.config.ts` | Replace Material preset with Aura (or customize Material), add brand palette | M |
| `src/app/shared/components/app-sidebar/app-sidebar.component.scss` | Active state, pill radius, border-left accent, dark mode polish | S |
| `src/app/shared/components/app-shell/app-shell.component.*` | Add top header bar slot, dark mode toggle placement | M |
| `src/app/core/services/theme.service.ts` | New: dark mode toggle service with localStorage | S |
| `src/app/features/auth/login.component.ts` | Brand the login card, background gradient | S |
| `src/app/features/sales/containers/pos.component.ts` | Product card hover uses correct primary color | S |
| `src/app/features/inventory/containers/inventory-dashboard.component.*` | Summary card icons use brand colors | XS |
| `src/app/features/reports/containers/reports-dashboard.component.html` | Metric card values use brand palette | XS |

---

## Approaches

### 1. Theme Override Only (Minimal Surface Area)
Override PrimeNG's Material preset via `definePreset()` with pharmacy brand tokens. Add Inter font. Add dark mode toggle. Tweak sidebar active state CSS.
- **Pros:** Minimal files changed; all PrimeNG components automatically retheme; consistent
- **Cons:** Material preset retains its rounded/elevated Material feel — not fully "flat SaaS"
- **Effort: S**

### 2. Switch to Aura Preset + Brand Override (Recommended)
Replace `Material` with `Aura` preset (PrimeNG's flat/modern preset), then apply `definePreset()` with brand tokens. Aura is specifically designed for SaaS internal tools — flat, clean, no Material elevation shadows.
- **Pros:** Matches design brief (flat design, SaaS internal tool); Aura has better default spacing and minimal chrome; primary/surface tokens apply uniformly
- **Cons:** Slightly more testing needed to verify all components look right; Aura has different surface variable names in some edge cases
- **Effort: M**

### 3. Full Custom Design System (Over-engineering)
Build a full custom theme with SCSS variables, custom PrimeNG theme, Storybook, etc.
- **Pros:** Maximum control
- **Cons:** Massive scope, overkill for an internal pharmacy tool
- **Effort: XL — out of scope**

---

## Recommendation

**Approach 2: Switch to Aura + brand override.**

PrimeNG's `Aura` preset is exactly what the brief describes: flat design, SaaS internal tool feel, no heavy shadows. Using `definePreset(Aura, { ... })` with the design system palette will retheme all 40+ PrimeNG components in one shot. Combined with:
1. Inter font in `index.html`
2. Token CSS vars in `styles.scss`
3. A `ThemeService` for dark mode toggle
4. Sidebar active-state CSS polish

...this achieves the full redesign with minimal risk.

---

## Top 6 Most Impactful Components to Redesign

Ranked by user-facing visibility and session frequency:

| Priority | Component | Why High Impact | Effort |
|----------|-----------|----------------|--------|
| 1 | **PrimeNG Preset (app.config.ts)** | Every component in the app inherits primary/surface/text colors from here. Switching to Aura + brand palette is the single highest-leverage change. | M |
| 2 | **AppSidebarComponent** | Persistent UI chrome — always visible. Active state currently uses wrong blue tones. First thing employees see on every interaction. | S |
| 3 | **LoginComponent** | First impression. Currently a bare Material card on `--surface-ground`. Needs brand identity: green accent, Inter font, clean flat card. | S |
| 4 | **POS Component (pos.component)** | Most-used feature for pharmacy employees. Product grid cards need brand hover states; cart panel needs clear visual hierarchy. | S |
| 5 | **Inventory Dashboard** | Summary stat cards need consistent icon colors with brand palette (currently raw `text-blue-500`, `text-orange-500` utility classes). | XS |
| 6 | **Shell Header (new)** | Adding a top header bar with dark mode toggle, user info, and page title elevates the perceived professionalism of the entire app. | M |

---

## Risks

- `var(--primary-50, #e3f2fd)` hardcoded fallbacks in sidebar and login will show wrong color until PrimeNG variables fully resolve — must audit and remove fallbacks or ensure the new preset defines them correctly.
- Aura preset uses different token names for some surface variables compared to Material — a quick grep for `--surface-*` usages after switching is required.
- Reports dashboard uses mixed Tailwind-like PrimeNG utility classes (`grid grid-cols-1 md:grid-cols-2`) and `p-card` components inconsistently — may need a pass to normalize.
- Dark mode `.dark-mode` class currently targets body/html — must confirm PrimeNG Aura's `darkModeSelector` behavior and where the class needs to live.
- No font is currently loaded — if Inter takes time to load (FOUT), consider a `font-display: swap` strategy.

---

## Ready for Proposal

**Yes.** The codebase is clean and well-structured. The redesign scope is well-bounded:
- One theme config change (`app.config.ts`)
- One font import (`index.html`)
- One token layer (`styles.scss`)
- One new service (`theme.service.ts`)
- CSS-only sidebar polish
- A new shell header component

No business logic is affected. All changes are presentation layer. The orchestrator can proceed to the proposal phase.
