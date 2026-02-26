import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { VaultService } from '../services/vault.service';

export const vaultGuard: CanActivateFn = () => {
  const vaultService = inject(VaultService);
  const router = inject(Router);

  if (vaultService.isUnlocked()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
