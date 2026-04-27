import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, LOCALE_ID, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar-EG';
import localeEn from '@angular/common/locales/en';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

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
    },
    // Block app bootstrap until the saved language's JSON is loaded.
    // Without this the sidebar/header can render before translations resolve,
    // showing raw keys like "sidebar.items.fees".
    provideAppInitializer(() => {
      const lang = inject(LanguageService);
      const translate = inject(TranslateService);
      return firstValueFrom(translate.use(lang.currentLanguage));
    })
  ]
};
