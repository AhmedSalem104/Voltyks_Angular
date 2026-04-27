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
      // `defaultLanguage` is deprecated in v17 in favor of `fallbackLang`.
      fallbackLang: 'ar'
    }),
    provideTranslateHttpLoader({
      prefix: '/assets/i18n/',
      suffix: '.json',
      // Bypass HttpClient interceptors (auth, case-transform, cache, retry,
      // error) for translation downloads. case-transform was lower-casing
      // dictionary keys (e.g. processStatus.Pending → pending) and the
      // cache layer was masking real fetch failures.
      useHttpBackend: true
    }),
    {
      provide: LOCALE_ID,
      useFactory: (langService: LanguageService) => langService.currentLocale,
      deps: [LanguageService]
    },
    // Block app bootstrap until the saved language's JSON is fetched and
    // parsed. Without this the sidebar/header can render before translations
    // resolve, showing raw keys like "sidebar.items.fees".
    provideAppInitializer(async () => {
      const lang = inject(LanguageService);
      const translate = inject(TranslateService);
      try {
        await firstValueFrom(translate.use(lang.currentLanguage));
      } catch (err) {
        // If the JSON fetch fails, fall back to Arabic so the app still boots.
        console.error('[i18n] failed to load translations for', lang.currentLanguage, err);
        try {
          await firstValueFrom(translate.use('ar'));
        } catch {
          /* swallow — at worst the UI shows raw keys */
        }
      }
    })
  ]
};
