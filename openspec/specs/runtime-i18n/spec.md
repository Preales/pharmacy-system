# runtime-i18n Specification

## Purpose

Defines the runtime internationalization contract for the pharmacy frontend: EN/ES language switching via ngx-translate without page reload, translation file loading, persistence, and string coverage.

## Requirements

### Requirement: Runtime Language Switching

The system MUST support switching between `en` and `es` at runtime without a page reload. `TranslateService.use(lang)` MUST update all active `| translate` pipes immediately. The default language MUST be `en`. If a translation key is missing in the active language, the system MUST fall back to the `en` value for that key.

#### Scenario: Switch to Spanish

- GIVEN the app is loaded in English
- WHEN the user activates the language toggle to `es`
- THEN all template strings using `| translate` re-render in Spanish immediately
- AND no page reload occurs

#### Scenario: Switch back to English

- GIVEN the app is displayed in Spanish
- WHEN the user activates the language toggle to `en`
- THEN all template strings re-render in English immediately

#### Scenario: Missing key falls back to English

- GIVEN `es.json` lacks a key that exists in `en.json`
- WHEN a component renders that key in Spanish mode
- THEN the English value is displayed
- AND no raw key string appears in the UI

### Requirement: Language Persistence

The system MUST persist the selected language to `localStorage` under the key `pharmacy-lang` via `TranslateService.use()`. On app load, the system MUST read `pharmacy-lang` from `localStorage` first, then fall back to `navigator.language`, then to `en`.

#### Scenario: Preference survives refresh

- GIVEN the user has selected `es`
- WHEN the browser is refreshed
- THEN the app loads in Spanish without user interaction

#### Scenario: First load with no preference

- GIVEN `localStorage` has no `pharmacy-lang` key
- WHEN the app initializes
- THEN the default language `en` is used

#### Scenario: Browser language respected

- GIVEN `localStorage` has no `pharmacy-lang` key
- AND `navigator.language` returns `es`
- WHEN the app initializes
- THEN the language is set to `es`

### Requirement: Translation File Loading

Translation files MUST be loaded at runtime via HTTP from `assets/i18n/{lang}.json`. The `HttpLoaderFactory` MUST point to `/assets/i18n/`. Files MUST follow a nested-by-feature JSON structure (e.g., `common`, `catalog`, `inventory`, `sales`, `reports`, `users`, `auth`). Both `en.json` and `es.json` MUST exist and cover all ~280 user-visible strings.

#### Scenario: Translation file loaded on init

- GIVEN the app bootstraps with language `en`
- WHEN `TranslateService` initializes
- THEN a GET request is made to `assets/i18n/en.json`
- AND the file resolves successfully

#### Scenario: Language switch triggers new file load

- GIVEN `es.json` has not been fetched yet
- WHEN the user switches to `es`
- THEN a GET request is made to `assets/i18n/es.json`

### Requirement: Template String Coverage

All user-visible strings in component templates MUST use the `| translate` pipe. TypeScript toast, confirm-dialog, and error strings MUST use `TranslateService.instant()`. Static option arrays that produce user-visible labels MUST be converted to getter methods calling `TranslateService.instant()` so they re-evaluate on language change.

#### Scenario: Template pipe applied

- GIVEN any component template with a user-visible string
- WHEN the component renders
- THEN the string is bound via `| translate` using a dot-notation key
- AND no hardcoded UI string appears as a literal in the template

#### Scenario: Toast string translated

- GIVEN a component that shows a success toast after saving
- WHEN the save operation completes in Spanish mode
- THEN the toast message is displayed in Spanish

#### Scenario: typeOptions re-render on toggle

- GIVEN `movement-history` or `sales-history` has a type-filter dropdown
- WHEN the user toggles the language
- THEN the dropdown options re-render in the new language immediately
