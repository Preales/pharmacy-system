# dark-mode-toggle Specification

## Purpose

Defines the full contract for dark mode support: the Angular signal service that manages state, localStorage persistence, and the toggle control in `AppHeaderComponent`.

## Requirements

### Requirement: ThemeService Signal State

The system MUST provide a `ThemeService` with an Angular 19 signal that represents the current dark mode state (`boolean`). The service MUST be provided at the root level.

#### Scenario: Default state is light mode

- GIVEN no preference is stored in `localStorage`
- WHEN `ThemeService` is injected
- THEN `isDarkMode()` returns `false`

#### Scenario: Signal reflects current theme

- GIVEN `ThemeService.toggle()` is called
- WHEN a component reads `isDarkMode()`
- THEN it receives the updated value reactively

### Requirement: localStorage Persistence

The system MUST persist the dark mode preference in `localStorage` under the key `'darkMode'`. On initialization, the service MUST read this key and restore the saved state.

#### Scenario: Preference persists across page reload

- GIVEN the user enabled dark mode and reloads the page
- WHEN `ThemeService` initializes
- THEN `isDarkMode()` returns `true` and the `.dark-mode` class is applied before first render

#### Scenario: Clearing storage resets to light mode

- GIVEN `localStorage` key `'darkMode'` is absent or `'false'`
- WHEN `ThemeService` initializes
- THEN `isDarkMode()` returns `false`

### Requirement: .dark-mode Class on html Element

The system MUST apply the `.dark-mode` CSS class to the `<html>` element when dark mode is active, and remove it when inactive. This MUST be the sole mechanism that activates the Aura dark color scheme. The `.dark-mode` block in `styles.scss` MUST define: `--text-color`, `--text-color-secondary`, and `--brand-primary-subtle`. This removes any dependency on hardcoded hex fallbacks in component SCSS.

#### Scenario: Toggle adds class to html

- GIVEN `isDarkMode()` is `false`
- WHEN `ThemeService.toggle()` is called
- THEN `document.documentElement` has the class `dark-mode`

#### Scenario: Toggle removes class from html

- GIVEN `isDarkMode()` is `true`
- WHEN `ThemeService.toggle()` is called
- THEN `document.documentElement` does NOT have the class `dark-mode`

### Requirement: No Hardcoded Color Fallbacks in Component SCSS

`app-header.component.scss` and `app-sidebar.component.scss` MUST NOT contain hardcoded hex literals in color declarations. All color references MUST use CSS custom properties (`var(--...)`).

#### Scenario: Header SCSS scan passes

- GIVEN `app-header.component.scss`
- WHEN scanned for hex color literals
- THEN no hex color values are found

#### Scenario: Sidebar SCSS scan passes

- GIVEN `app-sidebar.component.scss`
- WHEN scanned for hex color literals
- THEN no hex color values are found

### Requirement: AppHeaderComponent Toggle Button

The system MUST render a dark mode toggle button inside `AppHeaderComponent`. The button MUST reflect the current theme state visually (sun/moon icon or equivalent). Clicking it MUST call `ThemeService.toggle()`.

#### Scenario: Toggle button visible in header

- GIVEN `AppHeaderComponent` is rendered in the app shell
- WHEN the page loads
- THEN a dark mode toggle button is visible in the header area

#### Scenario: Button state reflects current mode

- GIVEN dark mode is active (`isDarkMode()` is `true`)
- WHEN the header renders
- THEN the toggle button displays the "light mode" icon (sun or equivalent)

#### Scenario: Clicking button toggles theme

- GIVEN the user clicks the toggle button
- WHEN the click handler fires
- THEN `ThemeService.toggle()` is called and the theme switches
