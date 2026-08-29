# Proposal: UI/UX Redesign — Pharmacy Frontend

## Intent

Replace the Material Design theme with a flat SaaS design system (Aura preset + pharmacy brand palette) across the Angular 19 pharmacy frontend. Current state: all PrimeNG components resolve to Material blue/grey defaults, Inter font is never loaded, dark mode is wired to nothing, and sidebar active states show incorrect blue fallbacks. Every pharmacy employee sees a misbranded UI on every session.

## Scope

### In Scope
- Switch PrimeNG preset: Material → Aura + `definePreset()` brand palette override
- Load Inter font via Google Fonts (`index.html` + `styles.scss`)
- Define CSS custom-property token layer in `styles.scss`
- `ThemeService` with Angular signal, `localStorage` persistence, and toggle button in `AppShellComponent`
- `AppSidebarComponent`: active pill with left-border accent, pharmacy green tones
- `LoginComponent`: brand card, green accent background
- `AppHeaderComponent` (new): dark mode toggle, user info, page title slot
- `PosComponent`: product card hover brand colors, cart panel visual hierarchy
- `InventoryDashboard`: stat card icon colors aligned to brand palette

### Out of Scope
- Business logic, API calls, or service layer
- Route or navigation changes
- Reports dashboard normalization (deferred)
- Custom font fallback / FOUT strategy beyond `font-display: swap`
- Sidebar collapse/expand mechanic
- Pharmacy-branded SVG logo (placeholder only)

## Capabilities

### New Capabilities
- `dark-mode-toggle`: ThemeService signal + localStorage + toggle button in AppHeaderComponent

### Modified Capabilities
- `app-theme`: Switch Material → Aura preset with brand palette override in `app.config.ts`
- `app-shell-layout`: Add AppHeaderComponent slot to AppShellComponent

## Approach

Use `definePreset(Aura, { theme: { colorScheme: { ... } } })` to inject pharmacy brand tokens into PrimeNG's flat/SaaS-appropriate Aura preset. This rethemes all 40+ PrimeNG components in one config change. Layer CSS custom properties on top for non-PrimeNG brand tokens. Add `ThemeService` (Angular 19 signal) to toggle `.dark-mode` on `<html>` and persist preference.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/index.html` | Modified | Add Google Fonts Inter link |
| `src/styles.scss` | Modified | CSS token layer + Inter font-family assignment |
| `src/app/app.config.ts` | Modified | Replace Material with Aura + `definePreset()` brand override |
| `src/app/core/services/theme.service.ts` | New | Dark mode signal + localStorage toggle |
| `src/app/shared/components/app-shell/app-shell.component.*` | Modified | Add AppHeaderComponent slot |
| `src/app/shared/components/app-header/app-header.component.*` | New | Header with dark mode toggle + user info + page title |
| `src/app/shared/components/app-sidebar/app-sidebar.component.scss` | Modified | Active pill: green bg, left-border accent, border-radius |
| `src/app/features/auth/login.component.ts` | Modified | Brand card + green accent |
| `src/app/features/sales/containers/pos.component.ts` | Modified | Product card hover + cart hierarchy |
| `src/app/features/inventory/containers/inventory-dashboard.component.*` | Modified | Stat card icon colors → brand palette |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Aura uses different surface token names than Material | Med | Grep `--surface-*` usages after switch; audit fallback hardcodes |
| `var(--primary-50, #e3f2fd)` fallbacks show blue until resolved | Med | Remove hardcoded fallbacks; ensure Aura defines `--primary-50` |
| Dark mode class placement mismatch with Aura selector | Low | Confirm `darkModeSelector: '.dark-mode'` targets `<html>`; test toggle |
| FOUT on Inter load | Low | Add `font-display: swap` to font link |

## Rollback Plan

`app.config.ts` is the single theme entry point — reverting the `providePrimeNG` preset import to `Material` restores the original theme instantly. `ThemeService` and `AppHeaderComponent` are additive; removing them from `AppShellComponent` template reverts the header. CSS token additions in `styles.scss` are isolated under a clear comment block — easy to revert via git diff.

## Dependencies

- `@primeng/themes` Aura preset available in `primeng@19.1.4` ✅
- Google Fonts Inter accessible at build/runtime (internal network access assumed)

## Success Criteria

- [ ] All PrimeNG components render with `#15803D` primary, not Material blue
- [ ] Inter font loads and is applied to `html, body`
- [ ] Dark mode toggle switches theme and persists across page reload
- [ ] Sidebar active item shows green left-border pill, no blue fallback visible
- [ ] Login card renders with brand green accent
- [ ] POS product cards show brand hover state; cart panel has clear hierarchy
- [ ] Inventory stat card icons use brand palette colors
- [ ] AppHeaderComponent visible in shell with dark mode toggle and user info
- [ ] No business logic tests broken (zero functional regressions)
