import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LoginDTO } from '../../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  currentYear = new Date().getFullYear();
  currentTheme: 'dark' | 'light' = 'dark';

  ngOnInit(): void {
    // If already authenticated, redirect to dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initializeForm();

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      emailOrPhone: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loginDto: LoginDTO = {
      EmailOrPhone: this.loginForm.value.emailOrPhone.trim(),
      Password: this.loginForm.value.password
    };

    this.authService.login(loginDto).subscribe({
      next: (response) => {
        this.isLoading = false;

        // Check if response indicates success
        const isSuccess = response.status === true ||
                         response.message === 'LoginSuccessful' ||
                         (response.data && response.data.token);

        if (isSuccess) {
          // Check if user is Admin
          if (!this.authService.isAdmin()) {
            this.authService.clearAuth();
            this.errorMessage = 'عذراً، لوحة التحكم متاحة للمسؤولين فقط';
            return;
          }

          // Wait a bit for cookies to be set, then navigate
          setTimeout(() => {
            const returnUrl = this.getReturnUrl();
            this.router.navigate([returnUrl]);
          }, 200);
        } else {
          this.errorMessage = response.message || 'فشل تسجيل الدخول';
        }
      },
      error: (error) => {
        this.isLoading = false;

        // Handle different error types
        if (error.status === 0) {
          this.errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت أو الاتصال بمسؤول النظام.';
        } else if (error.status === 401) {
          this.errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.status === 404) {
          this.errorMessage = 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً';
        } else if (error.status === 500) {
          this.errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً';
        } else {
          this.errorMessage = error.error?.message || 'حدث خطأ أثناء تسجيل الدخول';
        }
      }
    });
  }

  private getReturnUrl(): string {
    // Check if there's a return URL in the route params
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnUrl') || '/dashboard';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper methods for template
  get emailOrPhone() {
    return this.loginForm.get('emailOrPhone');
  }

  get password() {
    return this.loginForm.get('password');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'هذا الحقل مطلوب';
    }
    if (field?.hasError('minlength')) {
      const minLength = field.getError('minlength').requiredLength;
      return `الحد الأدنى ${minLength} أحرف`;
    }
    return '';
  }
}
