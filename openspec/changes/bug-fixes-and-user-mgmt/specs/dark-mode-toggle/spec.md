# Delta for dark-mode-toggle

## MODIFIED Requirements

### Requirement: .dark-mode Class on html Element

The system MUST apply the `.dark-mode` CSS class to the `<html>` element when dark mode is active, and remove it when inactive. This MUST be the sole mechanism that activates the Aura dark color scheme. The `.dark-mode` CSS block MUST define all tokens required by header and sidebar components — including sidebar/header text colors — so that no component SCSS file contains hardcoded color fallbacks.

Required tokens that MUST be present inside the `.dark-mode` block:

| Token | Purpose |
|-------|---------|
| `--text-color` | Primary text color in dark context |
| `--text-color-secondary` | Secondary/muted text in dark context |
| `--brand-primary-subtle` | Brand accent at reduced opacity for dark backgrounds |

(Previously: `.dark-mode` block defined, but sidebar/header text tokens were absent; components used hardcoded hex fallbacks `#1e293b`, `#fff5f5`)

#### Scenario: Toggle adds class to html

- GIVEN `isDarkMode()` is `false`
- WHEN `ThemeService.toggle()` is called
- THEN `document.documentElement` has the class `dark-mode`

#### Scenario: Toggle removes class from html

- GIVEN `isDarkMode()` is `true`
- WHEN `ThemeService.toggle()` is called
- THEN `document.documentElement` does NOT have the class `dark-mode`

#### Scenario: Dark mode tokens cover sidebar and header text

- GIVEN `.dark-mode` is active on `<html>`
- WHEN the sidebar and header render
- THEN text colors are resolved from CSS custom properties (`--text-color`, `--text-color-secondary`)
- AND no hardcoded hex values are applied

## ADDED Requirements

### Requirement: No Hardcoded Color Fallbacks in Component SCSS

Component SCSS files for `app-header` and `app-sidebar` MUST NOT contain hardcoded hex color values as fallback color declarations. All color values MUST reference CSS custom properties defined in `styles.scss`. A lint or review gate SHOULD flag any hex literal (`#[0-9a-fA-F]{3,6}`) in these component SCSS files.

#### Scenario: Header SCSS uses only CSS variables

- GIVEN `app-header.component.scss` is inspected
- WHEN it is scanned for hex color literals (`#1e293b`, `#fff5f5`, or similar)
- THEN no direct hex color fallbacks are found in color or background-color declarations

#### Scenario: Sidebar SCSS uses only CSS variables

- GIVEN `app-sidebar.component.scss` is inspected
- WHEN it is scanned for hex color literals
- THEN no direct hex color fallbacks are found in color or background-color declarations
