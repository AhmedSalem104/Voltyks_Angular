import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar-EG';
import localeEn from '@angular/common/locales/en';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authInterceptor, errorInterceptor, rateLimitInterceptor, retryInterceptor } from './core/interceptors';
import { caseTransformInterceptor } from './core/interceptors/case-transform.interceptor';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { LanguageService } from './core/services/language.service';

// Register supported locales for date/number pipes
registerLocaleData(localeAr, 'ar-EG');
registerLocaleData(localeEn, 'en-US');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
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
    provideTranslateService({
      defaultLanguage: 'ar',
      fallbackLang: 'ar'
    }),
    provideTranslateHttpLoader({
      prefix: '/assets/i18n/',
      suffix: '.json'
    }),
    {
      provide: LOCALE_ID,
      useFactory: (langService: LanguageService) => langService.currentLocale,
      deps: [LanguageService]
    }
  ]
};
