# User Management Specification

## Purpose

Admin-only CRUD operations for tenant users: list, create, edit, deactivate, and change role. All operations are tenant-scoped. No hard deletes — deactivation uses a soft-delete flag.

## Requirements

### Requirement: List Users

The system MUST provide a paginated, filterable list of all users in the current tenant. Only Admin role MAY access this list. Results MUST be filterable by `role` and `isActive` status.

| Field | Description |
|-------|-------------|
| `page` / `pageSize` | Pagination (default pageSize: 20) |
| `role` | Filter by role string (optional) |
| `isActive` | Filter by active status (optional) |

#### Scenario: Admin lists all users

- GIVEN an Admin user in Tenant A
- WHEN GET `/api/v1/users?page=1&pageSize=20` is called
- THEN a paginated response with users only from Tenant A is returned
- AND total count is included

#### Scenario: Filter by role

- GIVEN users with roles Admin, Pharmacist, Cashier in the tenant
- WHEN GET `/api/v1/users?role=Pharmacist` is called
- THEN only Pharmacist users are returned

#### Scenario: Non-Admin access denied

- GIVEN a user with role Pharmacist
- WHEN GET `/api/v1/users` is called
- THEN HTTP 403 is returned

---

### Requirement: Create User

Admin MUST be able to create a new user within their tenant. Required fields: `email`, `name`, `role` (Admin | Pharmacist | Cashier), `tenantId`. Email MUST be unique within the tenant. A random temporary password MUST be generated and returned once (or sent via email — implementation detail).

#### Scenario: Admin creates Pharmacist user

- GIVEN a valid Admin JWT and `{ email: "ph@farm.com", name: "Ana", role: "Pharmacist", tenantId: "t1" }`
- WHEN POST `/api/v1/users` is called
- THEN HTTP 201 is returned with the new user's id
- AND the user is active by default

#### Scenario: Duplicate email within tenant

- GIVEN "ph@farm.com" already exists in Tenant 1
- WHEN POST `/api/v1/users` with the same email in Tenant 1 is called
- THEN HTTP 409 is returned with a validation error

---

### Requirement: Edit User

Admin MUST be able to update a user's `name` and/or `role`. Email MUST NOT be editable after creation. Partial updates are acceptable (only provided fields change).

#### Scenario: Admin updates user name

- GIVEN a user with id "u1" and name "Ana"
- WHEN PUT `/api/v1/users/u1` with `{ name: "Ana García" }` is called
- THEN the user's name is updated to "Ana García"
- AND HTTP 200 is returned with the updated user

#### Scenario: Email field ignored on update

- GIVEN a PUT request body that includes `email`
- WHEN the request is processed
- THEN the email field is ignored and not changed

---

### Requirement: Deactivate User

Admin MUST be able to deactivate a user (soft delete). Deactivated users MUST NOT be able to log in. The user record MUST NOT be physically deleted. A deactivated user MUST appear in the list with `isActive: false` when filtered accordingly.

#### Scenario: Admin deactivates user

- GIVEN an active user with id "u1"
- WHEN DELETE `/api/v1/users/u1` is called by Admin
- THEN `isActive` is set to `false`
- AND HTTP 204 is returned
- AND the user record is still present in the database

#### Scenario: Deactivated user cannot log in

- GIVEN user "ph@farm.com" has `isActive: false`
- WHEN they attempt POST `/api/v1/auth/login`
- THEN HTTP 401 is returned

---

### Requirement: Change User Role

Admin MUST be able to change any user's role within their tenant. The system MUST prevent removing the Admin role from the last Admin user in the tenant.

#### Scenario: Admin changes role

- GIVEN a user with role "Cashier" and a second Admin present in the tenant
- WHEN PUT `/api/v1/users/u1/role` with `{ role: "Pharmacist" }` is called
- THEN the user's role is updated
- AND HTTP 200 is returned

#### Scenario: Last Admin guard

- GIVEN only one Admin user exists in the tenant
- WHEN PUT `/api/v1/users/{adminId}/role` with any non-Admin role is called
- THEN HTTP 422 is returned with error "Cannot remove the last Admin from a tenant"

---

### Requirement: User Management UI

The Angular frontend MUST provide a `/users` route (Admin-only guard) with:
- A list view (PrimeNG Table) showing name, email, role, status
- A dialog form for create and edit operations
- A confirm dialog for deactivate action

The route MUST be gated so non-Admin users are redirected to `/home`.

#### Scenario: Admin opens user list

- GIVEN the user has role Admin and navigates to `/users`
- WHEN the component initializes
- THEN a paginated table of users is rendered with name, email, role, and active status

#### Scenario: Admin opens create dialog

- GIVEN the Admin is on the `/users` page
- WHEN they click "New User"
- THEN a dialog form opens with fields: email, name, role (dropdown)
- AND on submit the form calls POST `/api/v1/users`

#### Scenario: Admin deactivates via confirm dialog

- GIVEN the Admin clicks "Deactivate" on a user row
- WHEN the confirm dialog is accepted
- THEN DELETE `/api/v1/users/{id}` is called
- AND the user's row updates to show inactive status

#### Scenario: Non-Admin navigates to /users

- GIVEN a user with role Pharmacist navigates to `/users`
- WHEN the route guard evaluates
- THEN the user is redirected to `/home`
