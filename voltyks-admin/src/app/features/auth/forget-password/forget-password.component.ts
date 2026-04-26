import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ForgetPasswordDto } from '../../../core/models';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  forgetPasswordForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentYear = new Date().getFullYear();
  currentTheme: 'dark' | 'light' = 'dark';

  ngOnInit(): void {
    this.initializeForm();

    // Subscribe to theme changes
    this.themeService.theme$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.forgetPasswordForm = this.fb.group({
      emailOrPhone: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  onSubmit(): void {
    if (this.forgetPasswordForm.invalid) {
      this.markFormGroupTouched(this.forgetPasswordForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dto: ForgetPasswordDto = {
      emailOrPhone: this.forgetPasswordForm.value.emailOrPhone.trim()
    };

    this.authService.forgetPassword(dto).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status) {
          this.successMessage = response.message || 'تم إرسال كود التحقق بنجاح. يرجى التحقق من هاتفك.';

          // Redirect to login after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.errorMessage = response.message || 'فشل إرسال كود التحقق';
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء معالجة الطلب';
        this.cdr.markForCheck();
      }
    });
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

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get emailOrPhone() {
    return this.forgetPasswordForm.get('emailOrPhone');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgetPasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.forgetPasswordForm.get(fieldName);
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
