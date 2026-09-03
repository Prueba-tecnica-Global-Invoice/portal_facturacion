import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Role } from '../models/login-response';
import { AuthService } from '../services/AuthService/auth-service';


export function roleGuard(requiredRole: Role): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(requiredRole)) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
}