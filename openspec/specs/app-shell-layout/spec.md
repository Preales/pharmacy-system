# app-shell-layout Specification

## Purpose

Defines the structural layout contract for `AppShellComponent`: the composition of header and sidebar slots, and the visual treatment of sidebar active states.

## Requirements

### Requirement: AppHeaderComponent in Shell

The system MUST include `AppHeaderComponent` as a distinct header slot inside `AppShellComponent`. The header MUST appear above the content area on every authenticated route.

#### Scenario: Header visible on all authenticated routes

- GIVEN the user is authenticated and navigates to any route
- WHEN `AppShellComponent` renders
- THEN `AppHeaderComponent` is visible at the top of the layout

#### Scenario: Header is part of shell, not individual pages

- GIVEN `AppHeaderComponent` is declared inside `AppShellComponent` template
- WHEN any child route is active
- THEN the header persists without re-mounting

### Requirement: Sidebar Active Pill Style

The system MUST style the active sidebar navigation item as a pill with a left-border accent in the brand primary color (`#15803D`). No blue fallback MUST be visible. Role-gated nav items MUST be conditionally rendered via `hasRole()` — NOT CSS-hidden. Reports nav item MUST be visible to Admin and Pharmacist only. Users nav item MUST be visible to Admin only.

| Property | Value |
|----------|-------|
| Background | `var(--brand-primary)` at low opacity (e.g. 10%) |
| Left border | `3px solid var(--brand-primary)` |
| Border radius | `0.375rem` (6px) |
| Text color | `var(--brand-primary)` |

#### Scenario: Active item shows green pill

- GIVEN the user navigates to a route whose sidebar link is active
- WHEN `AppSidebarComponent` renders
- THEN the active item has a green left-border pill style

#### Scenario: Inactive items have no pill style

- GIVEN multiple sidebar items exist
- WHEN a route is active
- THEN only the matching item has the pill style; all others render in default state

#### Scenario: No blue fallback visible

- GIVEN prior CSS used `var(--primary-50, #e3f2fd)` for active state
- WHEN the new sidebar SCSS is applied
- THEN no blue color appears in active or hover states

#### Scenario: Reports item hidden from Cashier

- GIVEN a user with role Cashier
- WHEN `AppSidebarComponent` renders
- THEN the Reports nav item is absent from the DOM

#### Scenario: Admin sees Reports and Users nav items

- GIVEN a user with role Admin
- WHEN `AppSidebarComponent` renders
- THEN both Reports and Users nav items are present in the DOM

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
