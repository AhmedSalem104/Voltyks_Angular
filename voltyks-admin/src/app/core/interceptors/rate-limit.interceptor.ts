import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, timer } from 'rxjs';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

/**
 * Rate Limit Interceptor - Handles 429 Too Many Requests errors for non-GET requests
 *
 * This interceptor handles rate limiting for POST, PUT, DELETE, etc. requests.
 * GET requests are handled by retryInterceptor with exponential backoff.
 *
 * When the server returns a 429 error, this interceptor:
 * 1. Shows a warning toast to the user
 * 2. Waits for the specified retry time (from Retry-After header or default 5s)
 * 3. Automatically retries the request once
 */
export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const toaster = inject(ToasterService);

  // Skip GET requests - handled by retry interceptor with exponential backoff
  if (req.method === 'GET') {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 429) {
        // Show warning to user
        toaster.warning('تم تجاوز حد الطلبات. جارٍ إعادة المحاولة...');

        // Get retry time from header or use default
        const retryAfter = error.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;

        // Wait and retry the request once
        return timer(waitTime).pipe(
          switchMap(() => next(req))
        );
      }

      // Pass through other errors
      return throwError(() => error);
    })
  );
};
