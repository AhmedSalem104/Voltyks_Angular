import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes that require authentication and Admin role
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  // Not authenticated or not Admin, clear auth and redirect to login
  if (authService.isAuthenticated() && !authService.isAdmin()) {
    authService.clearAuth();
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
