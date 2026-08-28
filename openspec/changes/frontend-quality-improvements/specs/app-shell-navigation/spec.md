# App Shell Navigation Specification

## Purpose

Defines the authenticated layout wrapper and inter-feature navigation. `AppShellComponent` provides the top-level shell for all authenticated routes; a logged-in user can navigate to any feature without editing the URL.

## Requirements

### Requirement: Authenticated Layout Shell

The system MUST provide `AppShellComponent` as the single authenticated layout wrapper. All authenticated routes MUST be children of `AppShellComponent` in `app.routes.ts`. Unauthenticated routes (login, tenant discovery) MUST NOT be nested under `AppShellComponent`.

#### Scenario: Authenticated route renders inside shell

- GIVEN a logged-in user navigates to `/inventory`
- WHEN the router activates the route
- THEN `AppShellComponent` is rendered as the layout host
- AND the inventory view is displayed inside the shell's content outlet

#### Scenario: Login route is not nested under shell

- GIVEN an unauthenticated user navigates to `/login`
- WHEN the router activates the route
- THEN `AppShellComponent` is NOT rendered
- AND only the login view is displayed

### Requirement: Inter-Feature Navigation

`AppShellComponent` MUST include navigation links to all authenticated feature modules (at minimum: Catalog, Inventory, Sales). A logged-in user MUST be able to navigate from any feature to any other feature by clicking a nav link. Navigation MUST NOT require manual URL editing.

#### Scenario: Navigate from Catalog to Inventory

- GIVEN a logged-in user is on the Catalog page
- WHEN they click the "Inventory" nav link
- THEN the router navigates to the Inventory feature
- AND the Inventory view renders without a full page reload

#### Scenario: All feature links are visible from any page

- GIVEN a logged-in user is on any authenticated page
- WHEN they inspect the navigation area
- THEN links to all authenticated features are visible and clickable

### Requirement: Auth Guard on Shell Routes

The auth guard MUST be applied at the `AppShellComponent` route level. All child routes MUST inherit protection from the parent guard. No individual child route MUST re-declare the auth guard.

#### Scenario: Unauthenticated access redirects to login

- GIVEN an unauthenticated user navigates directly to `/catalog`
- WHEN the router evaluates the guard
- THEN the user is redirected to `/login`
- AND the catalog view is not rendered
