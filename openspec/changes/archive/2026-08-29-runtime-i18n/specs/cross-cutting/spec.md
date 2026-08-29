# Delta for cross-cutting

## MODIFIED Requirements

### Requirement: Internationalization (i18n)

The system MUST use `@ngx-translate/core` for frontend i18n. Runtime language switching between `en` and `es` MUST occur without page reload via `TranslateService.use()`. The default language MUST be `en`; fallback to `en` MUST apply when a key is missing in the active language. Backend error messages and validation messages MUST use resource files (.resx) with `IStringLocalizer<T>`. All PrimeNG component labels MUST be translatable. API responses MUST include error messages in the requested locale (via `Accept-Language` header). Frontend locale extraction files (`messages.es.json`, `messages.en.json`) MUST NOT exist in `src/locale/`.

(Previously: frontend could use Angular built-in i18n OR ngx-translate; no runtime switching was specified; `es` was the default language)

#### Scenario: Spanish error message

- GIVEN a user with `Accept-Language: es`
- WHEN they submit an invalid product (missing name)
- THEN error message is "El nombre del producto es obligatorio"

#### Scenario: English error message

- GIVEN a user with `Accept-Language: en`
- WHEN they submit an invalid product (missing name)
- THEN error message is "Product name is required"

#### Scenario: Frontend locale switch

- GIVEN the UI is displayed in Spanish
- WHEN the user switches locale to English
- THEN all labels, messages, and PrimeNG components re-render in English

#### Scenario: No dead locale files

- GIVEN the `src/locale/` directory
- WHEN it is inspected
- THEN `messages.es.json` and `messages.en.json` are absent
- AND no build step references them

## ADDED Requirements

### Requirement: Language Preference Persistence (localStorage)

The system MUST persist the active language to `localStorage` under the key `pharmacy-lang`. On app bootstrap, the language resolution order MUST be: `localStorage['pharmacy-lang']` → `navigator.language` → `'en'`. This preference MUST survive browser refresh and tab close.

#### Scenario: Language persists across sessions

- GIVEN the user selected `es` during a previous session
- WHEN the app loads in a new tab or after refresh
- THEN `TranslateService` is initialized with `es` without user interaction

#### Scenario: localStorage key is the single persistence mechanism

- GIVEN a developer inspects frontend storage after a language toggle
- WHEN they inspect `localStorage`
- THEN only `pharmacy-lang` holds the language preference
- AND no cookie or sessionStorage key duplicates it
