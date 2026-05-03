import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenService } from './token.service';

export const guideGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.hasRole('guide')) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
