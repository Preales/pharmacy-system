# Proposal: Bug Fixes & User Management

## Intent

Resolve five confirmed issues found post-launch:
1. Dark mode tokens missing from `styles.scss` — header/sidebar use hardcoded hex fallbacks
2. Sidebar role-gating missing — all nav items visible to all authenticated users
3. `GET /api/v1/inventory` endpoint missing — ConflictAlerts feature returns 404
4. User Management CRUD missing — Admin has no UI or backend to manage users
5. Interceptor/page param inconsistencies across services

## Scope

### In Scope
- Dark mode CSS token extension in `styles.scss`
- Role-gated sidebar nav items via `hasRole()` computed method
- `GET /api/v1/inventory` paginated endpoint (new)
- User Management: CQRS backend (Create/Update/Deactivate/ChangeRole commands) + Angular feature module
- `page` vs `pageNumber` parameter alignment across all services
- `IsActive` migration on `ApplicationUser`

### Out of Scope
- Password reset flow
- Bulk user operations

## Approach

3-PR stacked chain:
- PR 1: Quick wins (dark mode, sidebar role filter, interceptor check)
- PR 2: Backend (GET /inventory + UserManagement CQRS)
- PR 3: Frontend (users feature module + routing)

## Rollback Plan

All backend changes are additive. Frontend `/users` route removal has no impact on other routes.
