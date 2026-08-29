import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

/**
 * Factory function for TranslateHttpLoader.
 * Loads translation files from /assets/i18n/<lang>.json.
 */
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

/**
 * Provides ngx-translate configured with HttpLoader and English as the default language.
 * Import this in app.config.ts providers array.
 */
export function provideTranslation(): EnvironmentProviders {
  return importProvidersFrom(
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'en',
    })
  );
}
