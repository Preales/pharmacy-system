# Frontend i18n Specification

## Purpose

Defines the Angular i18n infrastructure for the `es` (Spanish, Colombia) build: tagging, extraction, translation, and currency locale binding.

## Requirements

### Requirement: i18n Attribute Tagging

Every user-visible string in all 27 component templates MUST be tagged with an `i18n="@@<key>"` attribute. Dynamic interpolated strings MUST use ICU message format where applicable. Strings that are not user-visible (e.g., ARIA roles, structural attributes) MAY be omitted from tagging.

#### Scenario: Static label is tagged

- GIVEN a component template with a static heading
- WHEN the template is inspected
- THEN the heading element carries an `i18n="@@<key>"` attribute with a unique, stable key

#### Scenario: ICU format for pluralized string

- GIVEN a template that shows item count (e.g., "1 product / N products")
- WHEN the template is inspected
- THEN the string uses ICU plural format within the `i18n` attribute

### Requirement: XLIFF Extraction

Running `ng extract-i18n` MUST produce a valid `messages.xlf` source file in `src/locale/`. Every tagged string MUST appear as a `<trans-unit>` in the output file. The extraction MUST complete without errors.

#### Scenario: Extraction produces complete XLF

- GIVEN all templates are tagged with `i18n` attributes
- WHEN `ng extract-i18n` runs
- THEN `src/locale/messages.xlf` is created or updated
- AND every tagged string has a corresponding `<trans-unit>` entry

#### Scenario: Extraction fails on missing tag

- GIVEN a user-visible string without an `i18n` attribute
- WHEN `ng extract-i18n` runs
- THEN the string does NOT appear in `messages.xlf`
- AND this gap is detectable via diff against the previous extraction

### Requirement: Spanish Translation Population

`src/locale/messages.es.xlf` MUST contain a `<target>` element for every `<trans-unit>` in `messages.xlf`. No `<trans-unit>` MUST have an empty or placeholder `<target>`. The `es` locale build MUST produce no empty translation unit warnings.

#### Scenario: All units translated

- GIVEN `messages.es.xlf` exists with all `<target>` elements populated
- WHEN `ng build --localize` runs for the `es` locale
- THEN the build completes with zero "empty translation" warnings
- AND the compiled `es` build contains Spanish text

#### Scenario: Missing translation caught at build time

- GIVEN a `<trans-unit>` in `messages.es.xlf` has an empty `<target>`
- WHEN `ng build --localize` runs
- THEN the build emits a warning or error identifying the missing translation

### Requirement: Locale-Aware Currency Formatting

The Angular app MUST use `LOCALE_ID = 'es-CO'` for currency formatting in the `es` build. The currency pipe MUST display values using Colombian peso formatting. The `en` build MUST use its own locale configuration and MUST NOT be affected by the `es-CO` setting.

#### Scenario: Currency displays in Colombian format

- GIVEN the `es` build is loaded in the browser
- WHEN a monetary value is rendered via the currency pipe
- THEN it displays in `es-CO` format (e.g., `$ 1.000,00`)
- AND `AppCurrency.COP` is passed as the currency code

#### Scenario: Default build is unaffected

- GIVEN the default (non-localized) build is running
- WHEN a monetary value is rendered
- THEN the currency pipe uses the default locale configuration
- AND no `es-CO` formatting is applied

### Requirement: Localized Build Passes CI

`ng build --localize` MUST complete without compilation errors for all configured locales. This requirement MUST be verified after Wave 4 is merged.

#### Scenario: Localized build succeeds

- GIVEN all templates are tagged and all translations are populated
- WHEN `ng build --localize` runs
- THEN the build exits with code 0
- AND output bundles for all configured locales are produced
