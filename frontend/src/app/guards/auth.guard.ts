import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Factory function that returns a CanActivateFn for a given set of allowed roles.
 *
 * Usage in app.routes.ts:
 *   { path: 'student-dashboard',   canActivate: [roleGuard('student')]              }
 *   { path: 'admin-dashboard',     canActivate: [roleGuard('college-admin')]         }
 *   { path: 'super-admin-dashboard', canActivate: [roleGuard('superadmin')]          }
 */
export function roleGuard(allowedRoles: string | string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router      = inject(Router);

    // Not logged in at all → go to login
    if (!authService.isLoggedIn()) {
      return router.createUrlTree(['/login']);
    }

    // Logged in but wrong role → go to their correct dashboard
    if (!authService.isAuthorized(allowedRoles)) {
      const role = authService.getRole();
      const redirectMap: Record<string, string> = {
        'student':       '/student-dashboard',
        'college-admin': '/admin-dashboard',
        'superadmin':    '/super-admin-dashboard',
      };
      const target = (role && redirectMap[role]) ? redirectMap[role] : '/login';
      return router.createUrlTree([target]);
    }

    return true;
  };
}

/**
 * Guard for routes that should only be visible when NOT logged in (login / register).
 * If already logged in, redirects to the correct dashboard.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.isLoggedIn()) return true;

  const redirectMap: Record<string, string> = {
    'student':       '/student-dashboard',
    'college-admin': '/admin-dashboard',
    'superadmin':    '/super-admin-dashboard',
  };
  const role   = authService.getRole() ?? '';
  const target = redirectMap[role] ?? '/login';
  return router.createUrlTree([target]);
};