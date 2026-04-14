import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const requiredRole = route.data['role'];
  const userRole = authService.getRole();

  // If role matches, allow access
  if (userRole === requiredRole) {
    return true;
  }

  // Redirect to appropriate dashboard based on role
  if (userRole === 'student') {
    router.navigate(['/student-dashboard']);
  } else if (userRole === 'college-admin') {
    router.navigate(['/admin-dashboard']);
  } else if (userRole === 'superadmin') {
    router.navigate(['/super-admin-dashboard']);
  } else {
    router.navigate(['/login']);
  }
  
  return false;
};