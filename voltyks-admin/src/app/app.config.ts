import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar-EG';

import { routes } from './app.routes';
import { authInterceptor, errorInterceptor, rateLimitInterceptor, retryInterceptor } from './core/interceptors';
import { caseTransformInterceptor } from './core/interceptors/case-transform.interceptor';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';

// Register Arabic locale
registerLocaleData(localeAr, 'ar-EG');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([
        cacheInterceptor,        // Return cached GET responses immediately
        rateLimitInterceptor,    // Handle 429 for POST/PUT/DELETE
        retryInterceptor,        // Handle 429/5xx for GET with exponential backoff
        caseTransformInterceptor,
        authInterceptor,
        errorInterceptor
      ])
    ),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'ar-EG' }
  ]
};
