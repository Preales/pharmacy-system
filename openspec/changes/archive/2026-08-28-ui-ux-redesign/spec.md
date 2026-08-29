# Delta Specs: UI/UX Redesign

> **Scope**: visual/theme layer only. No business logic, no API, no route changes.
> Full domain specs are in `specs/{domain}/spec.md`. This file is a consolidated index.

---

## Domain: app-theme (new domain spec)

See [`specs/app-theme/spec.md`](specs/app-theme/spec.md)

### Summary

| Requirement | Type | Scenarios |
|-------------|------|-----------|
| Aura Preset with Brand Palette | NEW | 2 |
| CSS Custom-Property Token Layer | NEW | 2 |
| Inter Font Loading | NEW | 2 |

---

## Domain: dark-mode-toggle (new full spec)

See [`specs/dark-mode-toggle/spec.md`](specs/dark-mode-toggle/spec.md)

### Summary

| Requirement | Type | Scenarios |
|-------------|------|-----------|
| ThemeService Signal State | NEW | 2 |
| localStorage Persistence | NEW | 2 |
| .dark-mode Class on html Element | NEW | 2 |
| AppHeaderComponent Toggle Button | NEW | 3 |

---

## Domain: app-shell-layout (new domain spec)

See [`specs/app-shell-layout/spec.md`](specs/app-shell-layout/spec.md)

### Summary

| Requirement | Type | Scenarios |
|-------------|------|-----------|
| AppHeaderComponent in Shell | NEW | 2 |
| Sidebar Active Pill Style | NEW | 3 |

---

## Coverage

| Aspect | Status |
|--------|--------|
| Happy paths | ✅ Covered |
| Edge cases | ✅ Covered (missing storage, slow font, inactive items) |
| Error states | N/A — theme/visual only, no error flows |

## Next Step

Ready for design (`sdd-design`). Domains: `app-theme`, `dark-mode-toggle`, `app-shell-layout`.
