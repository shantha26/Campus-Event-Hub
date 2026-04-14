import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email         = '';
  password      = '';
  errorMessage  = '';
  successMessage = '';
  emailError    = '';
  passwordError = '';
  isLoading     = false;
  rememberMe    = false;
  showPassword  = false;

  constructor(private router: Router, private route: ActivatedRoute, private authService: AuthService) {
    this.route.queryParams.subscribe(params => {
      if (params['expired']) {
        this.errorMessage = 'Your session has expired. Please log in again.';
      }
    });
  }

  validate(): boolean {
    this.emailError    = '';
    this.passwordError = '';
    if (!this.email.trim()) {
      this.emailError = 'Email is required.';
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.emailError = 'Enter a valid email address.';
      return false;
    }
    if (!this.password) {
      this.passwordError = 'Password is required.';
      return false;
    }
    return true;
  }

  login() {
    this.errorMessage = '';
    if (!this.validate()) return;
    this.isLoading = true;

    this.authService.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (!res?.token) {
          this.errorMessage = 'Invalid server response.';
          return;
        }

        this.authService.saveUserData(
          res.token,
          res.role,
          res.fullName,
          this.email.trim(),
          res._id || res.userId || undefined,
          res.college || '',
          res.walletBalance || 0
        );
        this.redirectBasedOnRole(res.role);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }

  private redirectBasedOnRole(role: string) {
    const routes: Record<string, string> = {
      'student':       '/student-dashboard',
      'college-admin': '/admin-dashboard',
      'superadmin':    '/super-admin-dashboard'
    };
    if (routes[role]) {
      this.router.navigate([routes[role]]);
    } else {
      this.errorMessage = 'Unknown role. Contact support.';
    }
  }

  goToRegister() { this.router.navigate(['/register']); }
}