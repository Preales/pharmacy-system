# app-theme Specification

## Purpose

Defines the visual theme contract for the Angular 19 pharmacy frontend: PrimeNG preset, brand palette tokens, and typography. This is the single source of truth for how colors and fonts are applied across all components.

## Requirements

### Requirement: Aura Preset with Brand Palette

The system MUST configure PrimeNG using the Aura preset overridden with the pharmacy brand palette via `definePreset()` in `app.config.ts`. The previous Material preset MUST be removed.

| Token | Value |
|-------|-------|
| Primary color | `#15803D` (pharmacy green) |
| Accent color | `#0369A1` (blue) |
| Dark mode selector | `.dark-mode` |

#### Scenario: PrimeNG components resolve brand primary color

- GIVEN the app is bootstrapped with `providePrimeNG({ theme: definePreset(Aura, brandPalette) })`
- WHEN any PrimeNG component (button, input, datatable) renders
- THEN it displays `#15803D` as primary color, not Material blue

#### Scenario: Removing Material preset

- GIVEN `app.config.ts` previously imported `Material` from `@primeng/themes`
- WHEN the redesign is applied
- THEN the `Material` import is absent and no Material tokens are loaded

### Requirement: CSS Custom-Property Token Layer

The system MUST define a CSS token layer in `styles.scss` that exposes brand variables for non-PrimeNG elements.

| Variable | Value |
|----------|-------|
| `--brand-primary` | `#15803D` |
| `--brand-primary-dark` | `#166534` |
| `--brand-accent` | `#0369A1` |
| `--brand-surface` | `#F9FAFB` |

#### Scenario: Brand tokens available globally

- GIVEN `styles.scss` declares the token block under `:root`
- WHEN any component SCSS uses `var(--brand-primary)`
- THEN it resolves to `#15803D` without fallback

#### Scenario: No hardcoded Material fallbacks remain

- GIVEN prior code used `var(--primary-50, #e3f2fd)`
- WHEN the token layer is applied
- THEN the `#e3f2fd` fallback is removed and the variable resolves from the Aura palette

### Requirement: Inter Font Loading

The system MUST load Inter via Google Fonts in `index.html` and apply it as the base font-family in `styles.scss`.

#### Scenario: Inter applied to html and body

- GIVEN the Google Fonts `<link>` is present in `index.html` with `font-display=swap`
- WHEN the page loads
- THEN `html, body` render with `font-family: 'Inter', sans-serif`

#### Scenario: Font-display swap prevents FOUT blocking

- GIVEN `&display=swap` is appended to the Google Fonts URL
- WHEN the font is slow to load
- THEN text renders in the fallback sans-serif and swaps to Inter on load
