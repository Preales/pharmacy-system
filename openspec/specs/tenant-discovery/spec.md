# Spec: tenant-discovery

_Promoted from change: `tenant-login-resolution` | Date: 2026-06-09_

---

## Domain: `tenant-discovery`

### Purpose

Anonymous endpoint that resolves which active tenants contain a given email address, enabling pre-login tenant identification without requiring an authenticated session.

### Requirements

---

### Requirement: Tenant Lookup by Email

The system MUST expose `GET /api/v1/tenants/by-email?email={email}` as an anonymous, rate-limited endpoint. It MUST return an array of `TenantSummaryDto { id, name, slug }` for all active tenants where the given email exists. It MUST return an empty array (HTTP 200) for unknown emails. It MUST NOT return HTTP 404 or any message distinguishing a known vs unknown email.

#### Scenario: Single tenant found for known email

- GIVEN an email that exists in exactly one active tenant
- WHEN `GET /api/v1/tenants/by-email?email={email}` is called without authentication
- THEN the response is HTTP 200
- AND the body is `[{ "id": "...", "name": "...", "slug": "..." }]` with one entry

#### Scenario: Multiple tenants found for known email

- GIVEN an email that exists in two or more active tenants
- WHEN `GET /api/v1/tenants/by-email?email={email}` is called
- THEN the response is HTTP 200
- AND the body contains one entry per matching active tenant

#### Scenario: Unknown email returns empty array

- GIVEN an email that does not exist in any tenant
- WHEN `GET /api/v1/tenants/by-email?email={email}` is called
- THEN the response is HTTP 200
- AND the body is `[]`

#### Scenario: Rate limit exceeded

- GIVEN the caller has exceeded the `"auth"` rate limit policy
- WHEN `GET /api/v1/tenants/by-email?email={email}` is called
- THEN the response is HTTP 429
- AND no tenant data is returned

---

### Requirement: Cross-Tenant Query Filter Bypass

The system MUST bypass EF Core global query filters when querying tenants by email, so that the lookup is not scoped to the caller's tenant context (which is absent at login time).

#### Scenario: Email exists in a non-current tenant

- GIVEN a request with no `X-Tenant-Id` header and an email belonging to tenant B
- WHEN the tenant lookup runs
- THEN tenant B is included in the result
- AND no EF filter silently excludes it

---

### Requirement: Response Data Minimization

The endpoint MUST return only `{ id, name, slug }` per tenant. It MUST NOT include user details, roles, permissions, or any data beyond what is needed to identify a tenant for login selection.

#### Scenario: Response shape validation

- GIVEN a known email in one active tenant
- WHEN the endpoint is called
- THEN each item in the response contains exactly `id`, `name`, and `slug`
