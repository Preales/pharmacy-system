# Design: Runtime i18n Migration (ngx-translate)

## Technical Approach

Install `@ngx-translate/core@15` + `@ngx-translate/http-loader@8`, remove the empty Angular compile-time i18n block from `angular.json`, and wire a `provideTranslation()` helper into `app.config.ts`. Translation files are HTTP-loaded from `assets/i18n/{lang}.json` at runtime. `AppHeaderComponent` gets a toggle that calls `TranslateService.use()` and writes `localStorage['pharmacy-lang']`. All 23 components add `TranslatePipe` to `imports[]`; ~15 inject `TranslateService` for imperative strings. Static `typeOptions` arrays become getter methods.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| **Provider wiring** | `TranslateModule.forRoot()` inline vs. `provideTranslation()` helper | `provideTranslation()` helper in `app.config.ts` | Keeps config file clean; helper is testable and reusable |
| **Loader strategy** | Single flat JSON vs. nested-by-feature | Nested-by-feature (`common`, `catalog`, `inventory`, etc.) | Prevents key collisions; each team owns its namespace |
| **Static arrays** | Keep `readonly` + ngOnInit re-assign vs. getter calling `instant()` | Getter method | `computed()` is signal-based — simpler getter avoids coupling to signals; re-evaluates on every render cycle after `use()` |
| **PrimeNG dynamic labels** | `[label]="'key' \| translate"` vs `[attr.label]` | `[attr.label]="'key' \| translate"` for attribute-bound inputs | PrimeNG attribute inputs require attr binding; pipe in property binding works for `@Input()` |
| **LOCALE_ID removal** | Keep alongside ngx-translate | Remove | `@angular/localize` LOCALE_ID provider conflicts with runtime switching; ngx-translate owns locale entirely |

## Data Flow

```
App Bootstrap
  └── provideTranslation() registers HttpLoaderFactory
        └── TranslateService.setDefaultLang('en')
              └── TranslateService.use(resolveInitialLang())
                    └── GET /assets/i18n/{lang}.json

User clicks toggle (AppHeaderComponent)
  └── TranslateService.use(nextLang)
        ├── localStorage.setItem('pharmacy-lang', nextLang)
        ├── GET /assets/i18n/{nextLang}.json  (if not cached)
        └── All active TranslatePipe instances re-evaluate
              └── UI updates without reload
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@ngx-translate/core@15`, `@ngx-translate/http-loader@8` |
| `angular.json` | Modify | Remove `i18n` block and `extract-i18n` target entirely |
| `src/app/app.config.ts` | Modify | Add `provideTranslation()`, remove `LOCALE_ID` provider |
| `src/app/core/providers/translate.provider.ts` | Create | `provideTranslation()` helper with `HttpLoaderFactory` |
| `src/assets/i18n/en.json` | Create | ~280 English strings, nested by feature |
| `src/assets/i18n/es.json` | Create | ~280 Spanish strings, nested by feature |
| `src/app/shared/components/app-header/app-header.component.ts` | Modify | Inject `TranslateService`, add `toggleLang()`, read/write `localStorage` |
| `src/app/shared/components/app-header/app-header.component.html` | Modify | Add language toggle button (EN / ES) |
| `src/app/features/inventory/containers/movement-history.component.ts` | Modify | Convert `typeOptions` `readonly` array → getter method using `instant()` |
| `src/app/features/sales/containers/sales-history.component.ts` | Modify | Same `typeOptions` getter conversion (if exists) |
| All 23 affected components | Modify | Add `TranslatePipe` to `imports[]`; pipe template strings; inject `TranslateService` where needed |

## Interfaces / Contracts

```typescript
// src/app/core/providers/translate.provider.ts
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

export function provideTranslation(): EnvironmentProviders {
  return importProvidersFrom(
    TranslateModule.forRoot({
      loader: { provide: TranslateLoader, useFactory: HttpLoaderFactory, deps: [HttpClient] },
      defaultLanguage: 'en',
    })
  );
}

// Language resolution on bootstrap (called in APP_INITIALIZER or in AppComponent.ngOnInit)
function resolveInitialLang(): string {
  return localStorage.getItem('pharmacy-lang')
    ?? navigator.language?.slice(0, 2)
    ?? 'en';
}
```

```typescript
// assets/i18n/en.json — top-level structure
{
  "common": { "save": "Save", "cancel": "Cancel", ... },
  "catalog": { "title": "Product Catalog", ... },
  "inventory": { "title": "Inventory", "typeOptions": { "ingress": "Ingress", ... } },
  "sales": { ... },
  "reports": { ... },
  "users": { ... },
  "auth": { ... }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `provideTranslation()` wires loader correctly | Jasmine: verify `TranslateLoader` token resolves `TranslateHttpLoader` |
| Unit | `AppHeaderComponent.toggleLang()` persists to localStorage | Spy on `localStorage.setItem`; assert correct key/value |
| Unit | `movement-history` getter re-evaluates after `use()` | Call `translate.use('es')` then assert getter returns Spanish labels |
| Integration | Full language switch without reload | TestBed with real `TranslateModule`; assert template re-renders |
| Manual | All 23 components render no raw keys in either language | Visual pass after PR 1 merges infrastructure |

## Migration / Rollout

4-PR slice strategy (from proposal):
1. **PR 1 — Infrastructure**: packages, `angular.json` removal, `provideTranslation()`, JSON files, `AppHeaderComponent` toggle, `typeOptions` getter conversions. Unblocks all subsequent PRs.
2. **PR 2 — Shared / Auth / Catalog**: `TranslatePipe` + piped strings.
3. **PR 3 — Inventory / Sales**: `TranslatePipe` + `TranslateService` for toast strings.
4. **PR 4 — Reports / Users / Cleanup**: remaining components + remove any stale `@angular/localize` artifacts.

Rollback: revert PR 1 commit, remove packages (`npm install`), restore `angular.json` block. Template `| translate` pipes are harmless no-ops during rollback window.

## Open Questions

- None
