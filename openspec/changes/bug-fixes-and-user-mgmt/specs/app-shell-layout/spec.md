# Delta for app-shell-layout

## MODIFIED Requirements

### Requirement: Route Protection (Frontend)

The Angular app MUST use functional route guards to protect routes. Unauthenticated users MUST be redirected to login. Routes MUST be restricted by role. JWT token MUST be injected via functional HTTP interceptor. The interceptor MUST add the `X-Tenant-Id` header — sourced from the JWT `tenantId` claim — on every outbound request to `/api/**`. If `X-Tenant-Id` is absent, `TenantMiddleware` on the backend returns HTTP 400.
(Previously: no mention of `X-Tenant-Id` header requirement; interceptor only described as injecting JWT)

#### Scenario: Unauthenticated access to protected route

- GIVEN a user without a valid JWT
- WHEN they navigate to `/inventory`
- THEN they are redirected to `/auth/login`

#### Scenario: Interceptor adds X-Tenant-Id

- GIVEN an authenticated user with `tenantId: "t1"` in their JWT
- WHEN any HTTP request is dispatched to `/api/v1/**`
- THEN the request header `X-Tenant-Id: t1` is present

#### Scenario: Missing X-Tenant-Id causes backend 400

- GIVEN a request reaches the backend without `X-Tenant-Id`
- WHEN `TenantMiddleware` processes it
- THEN HTTP 400 is returned with an explanatory error message

### Requirement: Sidebar Active Pill Style

The system MUST style the active sidebar navigation item as a pill with a left-border accent in the brand primary color (`#15803D`). No blue fallback MUST be visible. Role-gated nav items MUST be conditionally rendered using `hasRole()` — not CSS hidden.

| Property | Value |
|----------|-------|
| Background | `var(--brand-primary)` at low opacity (e.g. 10%) |
| Left border | `3px solid var(--brand-primary)` |
| Border radius | `0.375rem` (6px) |
| Text color | `var(--brand-primary)` |

(Previously: no role-gate requirement for sidebar items)

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

#### Scenario: Reports item visible to Admin and Pharmacist only

- GIVEN a user with role Cashier
- WHEN `AppSidebarComponent` renders
- THEN the Reports nav item is NOT present in the DOM

#### Scenario: Admin sees all nav items including Users

- GIVEN a user with role Admin
- WHEN `AppSidebarComponent` renders
- THEN both the Reports and Users nav items are visible
