import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Guard that protects Registered User routes (such as Personal Archive).
 * Guests are redirected to the home page and prompted with the quick login modal.
 */
export const registeredGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  auth.openAuthModal('Sign in to view your Personal Archive of Memories.');
  return router.createUrlTree(['/']);
};
