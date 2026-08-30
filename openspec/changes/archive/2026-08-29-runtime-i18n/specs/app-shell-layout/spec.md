# Delta for app-shell-layout

## ADDED Requirements

### Requirement: Language Toggle in AppHeaderComponent

`AppHeaderComponent` MUST include a language toggle control that displays the current language as a flag or short code (`EN` / `ES`). Clicking the control MUST call `TranslateService.use()` with the alternate language and persist the selection to `localStorage` under key `pharmacy-lang`. The toggle MUST appear alongside the existing dark-mode toggle in the header.

#### Scenario: Toggle visible in header

- GIVEN the user is authenticated and `AppShellComponent` renders
- WHEN `AppHeaderComponent` is displayed
- THEN a language toggle button showing the current language code (EN or ES) is visible

#### Scenario: Toggle switches language

- GIVEN the app is in English
- WHEN the user clicks the language toggle
- THEN `TranslateService.use('es')` is called
- AND `localStorage.setItem('pharmacy-lang', 'es')` is set
- AND the toggle label updates to reflect the new language

#### Scenario: Toggle reflects persisted language on load

- GIVEN `localStorage` has `pharmacy-lang = 'es'`
- WHEN the header renders
- THEN the language toggle shows `ES` as the active language
