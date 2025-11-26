import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Error Interceptor - Handles HTTP errors globally
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'حدث خطأ غير متوقع';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `خطأ: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            errorMessage = 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.';
            // Redirect to login
            localStorage.removeItem('admin_token');
            router.navigate(['/login']);
            break;
          case 403:
            errorMessage = 'ليس لديك صلاحية للوصول إلى هذا المورد.';
            break;
          case 404:
            errorMessage = 'المورد المطلوب غير موجود.';
            break;
          case 500:
            errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
            break;
          default:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.error?.errors?.length) {
              errorMessage = error.error.errors.join(', ');
            }
        }
      }

      console.error('HTTP Error:', {
        status: error.status,
        message: errorMessage,
        url: error.url,
        error: error.error
      });

      // You can show a toast notification here
      // For now, we'll just log and rethrow
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error
      }));
    })
  );
};
