import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Auth Interceptor - Adds JWT token to all HTTP requests and enables cookies
 * In Angular 15+, we use functional interceptors
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Static assets (translation files, images, etc.) don't need auth headers.
  if (req.url.includes('/assets/')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getToken(); // Get token from localStorage or cookies

  // Clone the request (withCredentials disabled for CORS with wildcard origin)
  let modifiedReq = req.clone();

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
