# Design: UI/UX Redesign

## Technical Approach

Replace the Material preset with PrimeNG Aura, layer a CSS custom-property token system on top, add a signal-based `ThemeService` that persists dark-mode preference, and surface a new `AppHeaderComponent` inside the existing `AppShellComponent`. All visual corrections (sidebar active pill, login card, POS cards, inventory stat icons) consume the token layer — no business logic is touched.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Theme preset | `definePreset(Aura, { semantic: { primary: green scale } })` in `app.config.ts` | Keep Material, patch CSS | Aura ships flat SaaS defaults; green primary baked in at design-system level, not per-component |
| Token layer | CSS custom properties in `styles.scss` under `:root` + `.dark-mode` | SCSS variables | Runtime-switchable for dark mode; no build-time regeneration needed |
| Dark-mode activation | Toggle `.dark-mode` on `document.documentElement` | Toggle on `body` | PrimeNG `darkModeSelector: '.dark-mode'` is already configured on `html` element scope |
| ThemeService placement | `core/services/theme.service.ts` | Inline in header | Reusable across any component; follows existing service placement convention |
| AppHeaderComponent placement | `shared/components/app-header/` | `core/components/` | Follows the `shared/components/app-shell` + `app-sidebar` colocation pattern |
| Font loading | `@import` in `styles.scss` | `index.html` link tag | Keeps all global style config in one file; matches existing `@use 'primeicons'` pattern |

## Data Flow

```
localStorage('theme')
        │  read on init
        ▼
ThemeService (signal: isDark)
        │  toggleTheme()
        ├──► writes localStorage
        └──► sets/removes '.dark-mode' on document.documentElement
                    │
                    ▼
        PrimeNG Aura picks up darkModeSelector
        CSS :root / .dark-mode token overrides apply
                    │
                    ▼
        AppHeaderComponent (reads isDark signal for toggle icon)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/app.config.ts` | Modify | Replace `Material` import with `Aura`; wrap in `definePreset()` with green semantic primary |
| `src/styles.scss` | Modify | Add `@import` for Inter font; add `:root` token layer; add `.dark-mode` token overrides |
| `src/app/core/services/theme.service.ts` | Create | Signal-based service; reads/writes `localStorage('theme')`; toggles `.dark-mode` class |
| `src/app/shared/components/app-header/app-header.component.ts` | Create | Standalone component; injects `ThemeService` + `AuthService`; toggle button + user display |
| `src/app/shared/components/app-header/app-header.component.html` | Create | Header template with brand logo text, dark-mode toggle (PrimeIcons), user email |
| `src/app/shared/components/app-header/app-header.component.scss` | Create | Fixed-height topbar, flex layout, brand token usage |
| `src/app/shared/components/app-shell/app-shell.component.ts` | Modify | Import `AppHeaderComponent`; add to `imports[]` |
| `src/app/shared/components/app-shell/app-shell.component.html` | Modify | Add `<app-header />` above `.shell-body` |
| `src/app/shared/components/app-shell/app-shell.component.scss` | Modify | Account for header height in layout (flex-column on outer shell) |
| `src/app/shared/components/app-sidebar/app-sidebar.component.scss` | Modify | Replace `.nav-item.active` hardcoded `#e3f2fd` with `var(--brand-primary-subtle)`; add 3px left-border accent |
| `src/app/features/auth/login.component.ts` | Modify | Update inline styles to use `--brand-*` tokens; set `--surface-ground` background to `var(--brand-bg)` |
| `src/app/features/inventory/containers/inventory-dashboard.component.ts` | Modify | Update `.summary-icon` color to use `var(--brand-primary)` token |

## Interfaces / Contracts

```typescript
// core/services/theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(false);   // computed from localStorage on init
  toggleTheme(): void;                        // flips isDark, syncs DOM + localStorage
}
```

```scss
/* CSS token layer — styles.scss */
:root {
  --brand-primary:        #15803D;
  --brand-primary-hover:  #166534;
  --brand-primary-subtle: #DCFCE7;
  --brand-secondary:      #22C55E;
  --brand-accent:         #0369A1;
  --brand-bg:             #F0FDF4;
  --brand-card:           #FFFFFF;
  --brand-border:         #BBF7D0;
  --brand-destructive:    #DC2626;
}
.dark-mode {
  --brand-bg:    #0F172A;
  --brand-card:  #1E293B;
  --brand-border:#334155;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `ThemeService`: init from localStorage, toggle flips signal, DOM class, localStorage write | Jasmine/Jest with `localStorage` spy |
| Unit | `AppHeaderComponent`: renders toggle button, emits correct DOM class | Angular TestBed, fixture query |
| Visual | Token application on sidebar active pill, login card, inventory icons | Manual smoke test in light + dark mode |
| E2E | Not required — presentation-only change with no route or API impact | — |

## Migration / Rollout

No data migration required. Rollback: revert `app.config.ts` to `preset: Material` — all PrimeNG component tokens revert instantly. CSS custom properties are additive and do not conflict with existing `--surface-*` vars from Aura.

**Risk note from proposal**: grep `--surface-*` and `--primary-50` fallback values after switch — Aura token names differ from Material. Specifically `var(--primary-50, #e3f2fd)` in `app-sidebar.component.scss:61` must be replaced by `var(--brand-primary-subtle)`.

## Open Questions

- [ ] Should `AppHeaderComponent` display the current tenant name alongside the user email? (sidebar footer currently shows email only)
- [ ] Is a collapsed/mobile sidebar required in this slice, or deferred?
