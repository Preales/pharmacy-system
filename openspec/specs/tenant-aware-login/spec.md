# Spec: tenant-aware-login

_Promoted from change: `tenant-login-resolution` | Date: 2026-06-09_

---

## Domain: `tenant-aware-login`

### Purpose

Login and registration flows that resolve `tenantId` automatically before authentication, eliminating the chicken-and-egg deadlock where `tenantInterceptor` requires a logged-in user to know `tenantId`, but login requires `tenantId` to authenticate.

### Requirements

---

### Requirement: Login Auto-Resolution for Single Tenant

The system MUST auto-resolve `tenantId` when the login request arrives without an `X-Tenant-Id` header and the email belongs to exactly one active tenant. The login MUST proceed as if the header had been provided.

#### Scenario: Single-tenant user logs in without header

- GIVEN a user whose email belongs to one active tenant
- AND the request has no `X-Tenant-Id` header
- WHEN `POST /auth/login` is called with valid credentials
- THEN the system resolves the tenant automatically
- AND the response is HTTP 200 with a valid auth token

#### Scenario: Login with explicit header is unaffected

- GIVEN a valid `X-Tenant-Id` header is present on the request
- WHEN `POST /auth/login` is called
- THEN the existing header-based resolution applies
- AND the auto-resolve fallback is NOT invoked

---

### Requirement: Login Tenant Picker for Multi-Tenant Users

When a login request arrives without `X-Tenant-Id` and the email belongs to two or more active tenants, the system MUST return a structured error containing the tenant list so the client can present a picker.

#### Scenario: Multi-tenant user login without header

- GIVEN a user whose email belongs to two or more active tenants
- AND the request has no `X-Tenant-Id` header
- WHEN `POST /auth/login` is called
- THEN the response is HTTP 300 or HTTP 422
- AND the body contains a `TenantSelectionRequired` error with the tenant list `[{id, name, slug}]`

#### Scenario: Multi-tenant user retries with selected tenant

- GIVEN the client received a `TenantSelectionRequired` response and the user selected a tenant
- WHEN `POST /auth/login` is called with valid credentials and `X-Tenant-Id` set to the selected tenant
- THEN the response is HTTP 200 with a valid auth token

---

### Requirement: Login Rejection for Unknown Email (No Tenant)

When auto-resolution finds zero tenants for the given email, the system MUST return HTTP 401 with a generic authentication error. It MUST NOT disclose whether the email was not found or whether the credentials were wrong.

#### Scenario: Unknown email in login without header

- GIVEN an email that exists in no active tenant
- AND the request has no `X-Tenant-Id` header
- WHEN `POST /auth/login` is called
- THEN the response is HTTP 401
- AND the error message is identical to a wrong-password failure

---

### Requirement: Registration Tenant Auto-Resolution

The system MUST apply the same `tenantId` fallback logic to `POST /auth/register`. When no `X-Tenant-Id` header is present, it MUST resolve via email lookup before proceeding with registration.

#### Scenario: Single-tenant registration without header

- GIVEN a registration request with no `X-Tenant-Id` header
- AND the email belongs to one active tenant
- WHEN `POST /auth/register` is called
- THEN the tenant is resolved automatically
- AND registration proceeds as if the header had been supplied

#### Scenario: Unknown email during registration without header

- GIVEN a registration request with no `X-Tenant-Id` header
- AND the email belongs to no active tenant
- WHEN `POST /auth/register` is called
- THEN the response is HTTP 401

---

### Requirement: Frontend Two-Step Login Flow

The login UI MUST execute a two-step flow: step 1 resolves tenants on email blur; step 2 displays a tenant picker (if 2+ tenants) or proceeds directly (if 1 tenant). The `pendingTenantId` signal MUST be set before submitting credentials so `tenantInterceptor` includes it in the login request.

#### Scenario: Single-tenant user completes login in two steps

- GIVEN the user enters a known single-tenant email and tabs out
- WHEN step 1 resolves one tenant
- THEN the UI moves directly to the credentials step with no picker shown
- AND `pendingTenantId` is set to that tenant's id

#### Scenario: Multi-tenant user selects from picker

- GIVEN the user enters a multi-tenant email and tabs out
- WHEN step 1 resolves two or more tenants
- THEN the UI displays a tenant picker
- AND after the user selects a tenant, `pendingTenantId` is set and the credentials form is shown

#### Scenario: Tenant interceptor includes pending tenant id

- GIVEN `pendingTenantId` is set and `currentTenantId` is absent
- WHEN any HTTP request is sent (including the login call)
- THEN the `X-Tenant-Id` header is populated with `pendingTenantId`

#### Scenario: Unknown email shows error at step 1

- GIVEN the user enters an email that resolves to zero tenants
- WHEN step 1 completes
- THEN the UI shows an inline error at the email field
- AND does NOT advance to the credentials step
