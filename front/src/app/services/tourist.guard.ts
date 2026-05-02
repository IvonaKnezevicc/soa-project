import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenService } from './token.service';

export const touristGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.hasRole('tourist')) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
