import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';
import { CacheService } from '../services/cache.service';

/**
 * HTTP Cache Interceptor - Caches GET responses to reduce server requests
 *
 * Features:
 * - Only caches GET requests (safe, idempotent operations)
 * - Uses CacheService with TTL-based expiration (1 minute default)
 * - Skips caching for certain endpoints (notifications, auth, etc.)
 * - Returns cached response immediately if available
 *
 * Skipped endpoints:
 * - /notifications - Real-time data
 * - /auth/ - Authentication endpoints
 * - /admin/store/reservations - Dynamic data that changes frequently
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cacheService = inject(CacheService);

  // For non-GET requests (POST/PUT/PATCH/DELETE), invalidate related caches
  if (req.method !== 'GET') {
    // Strip query params, then strip any /{id}/{subpath} or /{id} so that
    // an action like POST /vehicle-addition-requests/15/accept invalidates
    // the cached list GET /vehicle-addition-requests?...
    const basePath = req.url.split('?')[0];
    const resourceBase = basePath.replace(/\/\d+(\/.*)?$/, '');
    cacheService.invalidate(`http_cache_${resourceBase}`);
    return next(req);
  }

  // Skip caching for certain endpoints
  if (shouldSkipCache(req.url)) {
    return next(req);
  }

  // Generate cache key from URL with params
  const cacheKey = `http_cache_${req.urlWithParams}`;

  // Check for cached response
  const cachedResponse = cacheService.get<HttpResponse<unknown>>(cacheKey);
  if (cachedResponse) {
    // Return cached response as a new HttpResponse
    return of(cachedResponse.clone());
  }

  // No cache - make request and cache the response
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.ok) {
        // Cache successful responses for 1 minute
        const responseToCache = event.clone();
        cacheService.set(cacheKey, responseToCache, 60000);
      }
    })
  );
};

/**
 * Check if the URL should skip caching
 */
function shouldSkipCache(url: string): boolean {
  const skipPatterns = [
    '/notifications',    // Real-time notification data
    '/auth/',           // Authentication endpoints
    '/reservations',    // Reservation data changes frequently
    '/unread-count',    // Notification count
    '/settings/',       // Admin settings (charging mode, etc.)
    '/app-config/',     // App configuration endpoints
    '/backup/',         // Backup downloads and listing
    'forceRefresh=true' // Explicit cache bypass
  ];

  return skipPatterns.some(pattern => url.includes(pattern));
}
