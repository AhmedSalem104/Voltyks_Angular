import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { retry, timer } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

/**
 * Retry Interceptor - Automatically retries failed GET requests
 *
 * Features:
 * - Only retries GET requests (safe, idempotent operations)
 * - Uses exponential backoff strategy
 * - Maximum 3 retry attempts
 * - Shows toast notification on 429 errors
 * - Different delays for different error types:
 *   - 429 (Rate Limit): 2s, 4s, 8s
 *   - 5xx (Server Error): 1s, 2s, 4s
 *   - Other errors: No retry
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const toaster = inject(ToasterService);
  const translate = inject(TranslateService);
  let rateLimitToastShown = false;

  // Only retry GET requests - other methods might have side effects
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Rate limit error - longer delays
        if (error.status === 429) {
          // Show toast only once per request
          if (!rateLimitToastShown) {
            toaster.warning(translate.instant('errors.rateLimitRetry'));
            rateLimitToastShown = true;
          }
          const delayMs = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
          return timer(delayMs);
        }

        // Server errors - shorter delays
        if (error.status >= 500) {
          const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          return timer(delayMs);
        }

        // Don't retry other errors (400, 401, 403, 404, etc.)
        throw error;
      }
    })
  );
};
