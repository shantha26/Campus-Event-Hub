import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  // Form fields
  fullName = '';
  email = '';
  college = '';
  role = 'student' ;   // default
  password = '';
  confirmPassword = '';

  // UI state
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  // ✅ Add these missing properties for the new HTML design
  showPassword = false;
  showConfirmPassword = false;
  acceptTerms = false;

  constructor(private router: Router, private authService: AuthService) {}

  register() {
    console.log('🔴🔴🔴 REGISTER BUTTON CLICKED! 🔴🔴🔴');
    alert('Register button clicked!'); // This will confirm if function is called

    // Log when function is called
    console.log('🔵 ===== REGISTER METHOD CALLED =====');
    console.log('📝 Form values:', {
      fullName: this.fullName,
      email: this.email,
      college: this.college,
      role: this.role,
      password: this.password ? '******' : '(empty)',
      confirmPassword: this.confirmPassword ? '******' : '(empty)'
    });

    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';

    // ✅ Add terms acceptance validation
    if (!this.acceptTerms) {
      console.log('❌ Validation failed: Terms not accepted');
      this.errorMessage = 'You must accept the Terms of Service and Privacy Policy.';
      return;
    }

    // Validate all fields are filled
    if (!this.fullName || !this.email || !this.college || !this.role || !this.password || !this.confirmPassword) {
      console.log('❌ Validation failed: Missing fields');
      console.log('Missing fields:', {
        fullName: !this.fullName,
        email: !this.email,
        college: !this.college,
        role: !this.role,
        password: !this.password,
        confirmPassword: !this.confirmPassword
      });
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    // Check if passwords match
    if (this.password !== this.confirmPassword) {
      console.log('❌ Validation failed: Passwords do not match');
      console.log('Password:', this.password, 'Confirm:', this.confirmPassword);
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    // Check password length
    if (this.password.length < 8) {
      console.log('❌ Validation failed: Password too short');
      this.errorMessage = 'Password must be at least 8 characters.';
      return;
    }

    console.log('✅ Validation passed');

    this.isLoading = true;

    const userData = {
      fullName: this.fullName,
      email: this.email,
      college: this.college,
      role: this.role,
      password: this.password
    };

    console.log('📤 Sending to API:', userData);

    this.authService.register(userData).subscribe({

      next: (res: any) => {
        console.log('✅ API Response received:', res);
        console.log('Response status:', res.status || 'success');
        console.log('Response data:', res);
        
        this.isLoading = false;
        this.successMessage = res.message || 'Registration successful! Redirecting...';

        if (res.token) {
          console.log('🔑 Token received, saving user data...');
          this.authService.saveUserData(
            res.token,
            res.role,
            res.fullName || this.fullName,
            res.email || this.email,
            res.userId,
            res.college || this.college,
            res.walletBalance || 0
          );
          console.log('✅ User data saved, redirecting in 1 second...');
          setTimeout(() => this.redirectBasedOnRole(res.role), 1000);
        } else {
          console.log('⚠️ No token received, redirecting to login...');
          setTimeout(() => this.router.navigate(['/login']), 1500);
        }
      },

      error: (err: any) => {
        console.error('❌ API Error occurred:');
        console.error('Error object:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error details:', err.error);
        
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Registration failed. Please try again.';
      }

    });

  }

  private redirectBasedOnRole(role: string) {
    console.log('🔄 Redirecting based on role:', role);
    
    const routes: any = {
      student: '/student-dashboard',
      'college-admin': '/admin-dashboard',
      superadmin: '/super-admin-dashboard'
    };

    const route = routes[role] || '/login';
    console.log('📍 Navigating to:', route);
    
    this.router.navigate([route]);
  }

  goToLogin() {
    console.log('🔵 Navigating to login page');
    this.router.navigate(['/login']);
  }

  getPasswordStrength(): string {
    if (!this.password) return '';
    
    let strength = 0;
    if (this.password.length >= 8) strength++;
    if (/[A-Z]/.test(this.password)) strength++;
    if (/[0-9]/.test(this.password)) strength++;
    if (/[^A-Za-z0-9]/.test(this.password)) strength++;
    
    if (strength <= 1) return 'weak';
    if (strength <= 2) return 'medium';
    if (strength >= 3) return 'strong';
    return '';
  }
}