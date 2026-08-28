# Delta for Cross-Cutting

## ADDED Requirements

### Requirement: Currency Constant

The system MUST define `AppCurrency.COP = 'COP'` in `app.constants.ts`. All components and pipes that reference a currency code MUST import `AppCurrency.COP`. The raw string literal `'COP'` MUST NOT appear in any file outside `app.constants.ts`.

#### Scenario: Currency constant used in pipe binding

- GIVEN a template that formats a monetary value
- WHEN the currency pipe is applied
- THEN it receives `AppCurrency.COP` imported from `app.constants.ts`
- AND the literal string `'COP'` does not appear in the template or component file

#### Scenario: No raw COP literals remain

- GIVEN a developer searches the codebase for the string `'COP'`
- WHEN the search runs across all `.ts` and `.html` files
- THEN zero occurrences appear outside `app.constants.ts`

### Requirement: Template URL Convention

The system MUST NOT define component templates inline (`template:` property). All 27 Angular components MUST use `templateUrl:` pointing to an external `.component.html` file. This convention MUST apply to all existing and future components.

#### Scenario: Component uses external template

- GIVEN any Angular component in the project
- WHEN its `@Component` decorator is inspected
- THEN `templateUrl:` is present and `template:` is absent

#### Scenario: No inline templates remain

- GIVEN a developer searches all `.component.ts` files for `template:`
- WHEN the search runs
- THEN zero occurrences of the inline `template:` property are found

---

## MODIFIED Requirements

### Requirement: Application Constants

The system MUST provide a single `AppConstants` module (`core/constants/app.constants.ts`) that exports `AppRoles`, `AppStatus`, `AppCurrency`, `LowStockThreshold`, and `Pagination` constant objects. Pagination options MUST be standardized to `[10, 25, 50]` across the entire application. All components and services that reference role names, status values, currency codes, threshold values, or pagination defaults MUST import from this module. Hardcoded string literals or magic numbers for roles, statuses, currency codes, thresholds, and pagination sizes MUST NOT appear outside this file.
(Previously: exported only `AppRoles`, `AppStatus`, and `Pagination`; did not include `AppCurrency` or `LowStockThreshold`; pagination options were inconsistent `[10,20,50]` vs `[10,25,50]`)

#### Scenario: Role constant used in guard

- GIVEN a route or UI guard that checks for Admin access
- WHEN the guard is evaluated
- THEN it reads `AppRoles.ADMIN` from `app.constants.ts`
- AND the literal string `'Admin'` does not appear in the guard code

#### Scenario: Constants file is the single source of truth

- GIVEN a developer searches the codebase for `'Pharmacist'` string literal
- WHEN the search runs
- THEN zero occurrences appear outside `app.constants.ts`

#### Scenario: Pagination options are consistent

- GIVEN any paginated list component in the application
- WHEN its rows-per-page options are inspected
- THEN the options are `[10, 25, 50]`
- AND no component uses `[10, 20, 50]` or any other variant

#### Scenario: Low stock threshold imported from constants

- GIVEN a component that computes low-stock status
- WHEN it evaluates stock level
- THEN it reads `LowStockThreshold` from `app.constants.ts`
- AND no magic number appears inline in the component

---

### Requirement: Sidebar Style Centralization

The system MUST define sidebar markup and scoped CSS in a single `AppSidebarComponent` (`shared/components/app-sidebar/`). All 4 feature shell components MUST delegate sidebar rendering to `AppSidebarComponent`. Sidebar CSS MUST NOT be duplicated across feature shell stylesheets. The global `src/styles.scss` MUST NOT contain sidebar rules that are superseded by `AppSidebarComponent`'s scoped styles.
(Previously: sidebar HTML (~70 lines) and CSS were duplicated across all 4 feature shell components with no shared component)

#### Scenario: Sidebar rendered via shared component

- GIVEN any feature shell is displayed in the browser
- WHEN DevTools inspect the sidebar DOM
- THEN the sidebar element is rendered by `AppSidebarComponent`
- AND no per-shell inline sidebar markup is present

#### Scenario: No duplicated sidebar CSS

- GIVEN a developer searches all feature shell stylesheets for sidebar rules
- WHEN the search runs
- THEN zero sidebar CSS declarations are found outside `AppSidebarComponent`'s stylesheet
