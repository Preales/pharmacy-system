# user-management Specification

## Purpose

Defines the contract for Admin-only user management: listing, creating, editing, deactivating, and changing roles for users within a tenant. All operations are tenant-scoped and Admin-restricted.

## Requirements

### Requirement: List Users

Paginated (default pageSize: 20), filterable by `role` and `isActive`. Admin only — HTTP 403 for others. Tenant-scoped.

#### Scenario: Admin lists users

- GIVEN a tenant with 35 users
- WHEN Admin requests GET `/api/v1/users`
- THEN a paginated result is returned with up to 20 users and total count 35

#### Scenario: Filter by role

- GIVEN users with roles Admin, Pharmacist, and Cashier
- WHEN Admin filters by role=Pharmacist
- THEN only Pharmacist users are returned

#### Scenario: Pharmacist access denied

- GIVEN a user with role Pharmacist
- WHEN they request GET `/api/v1/users`
- THEN HTTP 403 is returned

### Requirement: Create User

Fields: `email`, `firstName`, `lastName`, `role` (Admin|Pharmacist|Cashier), `tenantId`. Email unique per tenant.

#### Scenario: Valid create

- GIVEN a valid Admin request with unique email
- WHEN POST `/api/v1/users` is submitted
- THEN HTTP 201 is returned with `isActive: true`

#### Scenario: Duplicate email

- GIVEN a user with that email already exists in the tenant
- WHEN POST `/api/v1/users` is submitted
- THEN HTTP 409 is returned

### Requirement: Edit User

Admin updates `firstName` and/or `lastName`. Email MUST NOT be editable. Partial updates allowed.

#### Scenario: Update name

- GIVEN an existing user
- WHEN Admin submits PUT `/api/v1/users/{id}` with a new firstName
- THEN HTTP 200 is returned with the updated user

#### Scenario: Email field ignored

- GIVEN a PUT request with an email field in the body
- WHEN the request is processed
- THEN the email field is ignored and the original email is preserved

### Requirement: Deactivate User

Soft delete via `isActive = false`. Record NOT physically deleted. Deactivated users MUST NOT log in.

#### Scenario: Deactivate user

- GIVEN an active user
- WHEN Admin submits DELETE `/api/v1/users/{id}`
- THEN `isActive` is set to `false`, HTTP 204 is returned, and the record remains in the database

#### Scenario: Deactivated user login fails

- GIVEN a user with `isActive = false`
- WHEN they attempt to log in
- THEN HTTP 401 is returned

### Requirement: Change User Role

Admin changes any user's role. MUST prevent removing Admin role from the last Admin in a tenant.

#### Scenario: Change role with multiple Admins

- GIVEN a tenant with 2 Admins
- WHEN Admin submits PUT `/api/v1/users/{id}/role` to downgrade one Admin
- THEN HTTP 200 is returned with the updated user

#### Scenario: Last Admin downgrade blocked

- GIVEN a tenant with exactly 1 Admin
- WHEN Admin submits PUT `/api/v1/users/{id}/role` to change that Admin's role
- THEN HTTP 422 is returned with message "Cannot remove the last Admin from a tenant"

### Requirement: User Management UI

Route `/users` gated to Admin. List view (PrimeNG Table: name, email, role, status) + dialog form (create/edit) + confirm dialog (deactivate). Non-Admin navigates to `/users` → redirected to `/home`.

#### Scenario: Admin accesses user management

- GIVEN a user with role Admin
- WHEN they navigate to `/users`
- THEN the user list is displayed with columns: name, email, role, status

#### Scenario: Non-Admin redirected

- GIVEN a user with role Pharmacist or Cashier
- WHEN they navigate to `/users`
- THEN they are redirected to `/home`
