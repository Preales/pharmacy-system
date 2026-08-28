# Specs: Frontend Quality Improvements

## Domain Index

| Domain | Type | File |
|--------|------|------|
| `cross-cutting` | Delta | `specs/cross-cutting/spec.md` |
| `app-shell-navigation` | New (full) | `specs/app-shell-navigation/spec.md` |
| `frontend-i18n` | New (full) | `specs/frontend-i18n/spec.md` |

---

## cross-cutting — Delta

### ADDED Requirements

#### Requirement: Currency Constant

The system MUST define `AppCurrency.COP = 'COP'` in `app.constants.ts`. All components and pipes that reference a currency code MUST import `AppCurrency.COP`. The raw string literal `'COP'` MUST NOT appear in any file outside `app.constants.ts`.

**Scenario: Currency constant used in pipe binding**
- GIVEN a template that formats a monetary value
- WHEN the currency pipe is applied
- THEN it receives `AppCurrency.COP` imported from `app.constants.ts`
- AND the literal string `'COP'` does not appear in the template or component file

**Scenario: No raw COP literals remain**
- GIVEN a developer searches the codebase for the string `'COP'`
- WHEN the search runs across all `.ts` and `.html` files
- THEN zero occurrences appear outside `app.constants.ts`

#### Requirement: Template URL Convention

The system MUST NOT define component templates inline (`template:` property). All 27 Angular components MUST use `templateUrl:` pointing to an external `.component.html` file.

**Scenario: Component uses external template**
- GIVEN any Angular component in the project
- WHEN its `@Component` decorator is inspected
- THEN `templateUrl:` is present and `template:` is absent

**Scenario: No inline templates remain**
- GIVEN a developer searches all `.component.ts` files for `template:`
- WHEN the search runs
- THEN zero occurrences of the inline `template:` property are found

### MODIFIED Requirements

#### Requirement: Application Constants

The system MUST provide a single `AppConstants` module (`core/constants/app.constants.ts`) that exports `AppRoles`, `AppStatus`, `AppCurrency`, `LowStockThreshold`, and `Pagination` constant objects. Pagination options MUST be standardized to `[10, 25, 50]`. All components and services that reference role names, status values, currency codes, threshold values, or pagination defaults MUST import from this module. Hardcoded literals or magic numbers MUST NOT appear outside this file.
(Previously: exported only `AppRoles`, `AppStatus`, `Pagination`; no `AppCurrency` or `LowStockThreshold`; pagination inconsistent `[10,20,50]` vs `[10,25,50]`)

**Scenario: Role constant used in guard** — unchanged (see domain file)
**Scenario: Constants file is the single source of truth** — unchanged (see domain file)

**Scenario: Pagination options are consistent**
- GIVEN any paginated list component
- WHEN its rows-per-page options are inspected
- THEN the options are `[10, 25, 50]` with no variant

**Scenario: Low stock threshold imported from constants**
- GIVEN a component that computes low-stock status
- WHEN it evaluates stock level
- THEN it reads `LowStockThreshold` from `app.constants.ts`

#### Requirement: Sidebar Style Centralization

The system MUST define sidebar markup and scoped CSS in a single `AppSidebarComponent`. All 4 feature shell components MUST delegate sidebar rendering to it. Sidebar CSS MUST NOT be duplicated across feature shell stylesheets.
(Previously: sidebar HTML/CSS duplicated ~70 lines × 4 shells; no shared component existed)

**Scenario: Sidebar rendered via shared component**
- GIVEN any feature shell is displayed
- WHEN DevTools inspect the sidebar DOM
- THEN the sidebar element is rendered by `AppSidebarComponent`
- AND no per-shell inline sidebar markup is present

**Scenario: No duplicated sidebar CSS**
- GIVEN a developer searches all feature shell stylesheets
- WHEN the search runs
- THEN zero sidebar CSS declarations appear outside `AppSidebarComponent`'s stylesheet

---

## app-shell-navigation — New Full Spec

### Requirement: Authenticated Layout Shell

`AppShellComponent` MUST be the single authenticated layout wrapper. All authenticated routes MUST be children of `AppShellComponent`. Unauthenticated routes MUST NOT be nested under it.

**Scenario: Authenticated route renders inside shell**
- GIVEN a logged-in user navigates to `/inventory`
- WHEN the router activates the route
- THEN `AppShellComponent` is rendered as layout host and inventory view displays inside it

**Scenario: Login route is not nested under shell**
- GIVEN an unauthenticated user navigates to `/login`
- WHEN the router activates the route
- THEN `AppShellComponent` is NOT rendered

### Requirement: Inter-Feature Navigation

`AppShellComponent` MUST include navigation links to all authenticated feature modules. A logged-in user MUST navigate between features by clicking nav links without URL editing.

**Scenario: Navigate from Catalog to Inventory**
- GIVEN a logged-in user is on the Catalog page
- WHEN they click the "Inventory" nav link
- THEN the router navigates to Inventory without a full page reload

**Scenario: All feature links visible from any page**
- GIVEN a logged-in user is on any authenticated page
- WHEN they inspect the navigation area
- THEN links to all authenticated features are visible and clickable

### Requirement: Auth Guard on Shell Routes

The auth guard MUST be applied at the `AppShellComponent` route level. Child routes MUST inherit the guard. No child route MUST re-declare the guard independently.

**Scenario: Unauthenticated access redirects to login**
- GIVEN an unauthenticated user navigates directly to `/catalog`
- WHEN the router evaluates the guard
- THEN the user is redirected to `/login` and the catalog view is not rendered

---

## frontend-i18n — New Full Spec

### Requirement: i18n Attribute Tagging

Every user-visible string in all 27 templates MUST carry `i18n="@@<key>"`. Dynamic strings MUST use ICU message format.

**Scenario: Static label is tagged**
- GIVEN a component template with a static heading
- WHEN inspected
- THEN the element carries `i18n="@@<key>"` with a unique, stable key

**Scenario: ICU format for pluralized string**
- GIVEN a template that shows item count
- WHEN inspected
- THEN the string uses ICU plural format within the `i18n` attribute

### Requirement: XLIFF Extraction

`ng extract-i18n` MUST produce a valid `messages.xlf` in `src/locale/`. Every tagged string MUST appear as a `<trans-unit>`. Extraction MUST complete without errors.

**Scenario: Extraction produces complete XLF**
- GIVEN all templates are tagged
- WHEN `ng extract-i18n` runs
- THEN `src/locale/messages.xlf` is created/updated with every tagged string

### Requirement: Spanish Translation Population

`messages.es.xlf` MUST contain a populated `<target>` for every `<trans-unit>`. No empty targets. `ng build --localize` MUST produce zero empty translation warnings.

**Scenario: All units translated**
- GIVEN `messages.es.xlf` has all targets populated
- WHEN `ng build --localize` runs
- THEN build completes with zero empty translation warnings

**Scenario: Missing translation caught at build time**
- GIVEN a `<trans-unit>` with an empty `<target>`
- WHEN `ng build --localize` runs
- THEN a warning/error identifies the missing translation

### Requirement: Locale-Aware Currency Formatting

The `es` build MUST use `LOCALE_ID = 'es-CO'`. Currency pipe MUST display Colombian peso format. The `en` build MUST NOT be affected.

**Scenario: Currency displays in Colombian format**
- GIVEN the `es` build is loaded
- WHEN a monetary value is rendered via the currency pipe
- THEN it displays in `es-CO` format and `AppCurrency.COP` is passed as currency code

### Requirement: Localized Build Passes CI

`ng build --localize` MUST complete without compilation errors for all configured locales.

**Scenario: Localized build succeeds**
- GIVEN all templates are tagged and all translations populated
- WHEN `ng build --localize` runs
- THEN the build exits 0 and bundles for all configured locales are produced
