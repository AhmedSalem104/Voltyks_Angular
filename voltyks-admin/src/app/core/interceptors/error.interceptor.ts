import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

/**
 * Error Interceptor - Handles HTTP errors globally
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const translate = inject(TranslateService);
  const t = (key: string, params?: any) => translate.instant(key, params);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = t('errors.unexpected');

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = t('errors.clientPrefix', { message: error.error.message });
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            errorMessage = t('errors.unauthorized');
            // Redirect to login
            localStorage.removeItem('admin_token');
            router.navigate(['/login']);
            break;
          case 403:
            errorMessage = t('errors.forbidden');
            break;
          case 404:
            errorMessage = t('errors.notFound');
            break;
          case 500:
            errorMessage = t('errors.server');
            break;
          default:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.error?.errors?.length) {
              errorMessage = error.error.errors.join(', ');
            }
        }
      }

      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error
      }));
    })
  );
};
