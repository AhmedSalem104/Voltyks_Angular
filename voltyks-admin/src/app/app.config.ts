import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar-EG';

import { routes } from './app.routes';
import { authInterceptor, errorInterceptor } from './core/interceptors';
import { caseTransformInterceptor } from './core/interceptors/case-transform.interceptor';

// Register Arabic locale
registerLocaleData(localeAr, 'ar-EG');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([caseTransformInterceptor, authInterceptor, errorInterceptor])
    ),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'ar-EG' }
  ]
};
