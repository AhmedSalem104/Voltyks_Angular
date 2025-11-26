import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes that require authentication
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('=== AUTH GUARD CHECK ===');
  console.log('Checking route:', state.url);
  console.log('Is authenticated:', authService.isAuthenticated());
  console.log('Current user:', authService.currentUserValue);
  console.log('Token:', authService.getToken()?.substring(0, 20) + '...');
  console.log('======================');

  if (authService.isAuthenticated()) {
    console.log('✅ Access granted to:', state.url);
    return true;
  }

  // Not authenticated, redirect to login with return url
  console.log('❌ Access denied, redirecting to login');
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
