import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { provideTranslation } from './core/i18n/translate.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, tenantInterceptor, errorInterceptor])
    ),
    provideAnimationsAsync(),
    provideTranslation(),
    providePrimeNG({
      theme: {
        preset: definePreset(Aura, {
          semantic: {
            primary: {
              50:  '{green.50}',
              100: '{green.100}',
              200: '{green.200}',
              300: '{green.300}',
              400: '{green.400}',
              500: '#15803D',
              600: '#166534',
              700: '#14532D',
              800: '#052E16',
              900: '#022c1a',
              950: '#011a10',
            },
          },
        }),
        options: {
          darkModeSelector: '.dark-mode',
        },
      },
    }),
  ],
};
