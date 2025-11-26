import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Auth Interceptor - Adds JWT token to all HTTP requests and enables cookies
 * In Angular 15+, we use functional interceptors
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken(); // Get token from localStorage or cookies

  // Clone the request and add withCredentials to enable cookies
  let modifiedReq = req.clone({
    withCredentials: true // Always send/receive cookies with requests
  });

  // If token exists, also add it to Authorization header (for APIs that use Bearer token)
  if (token) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq);
};
