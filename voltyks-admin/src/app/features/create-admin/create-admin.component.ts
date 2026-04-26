import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AdminUsersService } from '../../core/services/admin/admin-users.service';
import { CreateAdminDto, CreatedAdminDto } from '../../core/models';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-create-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingOverlayComponent
  , TranslatePipe],
  templateUrl: './create-admin.component.html',
  styleUrls: ['./create-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateAdminComponent implements OnDestroy {
  // Step state
  step: 'send-otp' | 'create-form' | 'success' = 'send-otp';

  // OTP
  phoneHint: string = '';
  otpExpirySeconds: number = 0;
  resendCooldown: number = 0;
  private otpTimerInterval: any = null;
  private resendTimerInterval: any = null;

  // Loading
  isLoading: boolean = false;

  // Form
  createDto: CreateAdminDto = {
    otpCode: '',
    phoneNumber: '',
    password: '',
    fullName: '',
    email: ''
  };

  // Field errors
  phoneError: string = '';
  emailError: string = '';

  // Success data
  createdAdmin: CreatedAdminDto | null = null;

  constructor(
    private usersService: AdminUsersService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ========== Step 1: Send OTP ==========

  sendOtp(): void {
    this.isLoading = true;
    this.usersService.sendCreateAdminOtp().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.phoneHint = response.data.phoneHint;
          this.toaster.success('تم إرسال كود التحقق إلى هاتفك');
          this.step = 'create-form';
          this.startOtpTimer();
          this.startResendCooldown();
        } else {
          this.toaster.error(response.message || 'فشل إرسال كود التحقق');
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.error?.message || error.message || 'فشل إرسال كود التحقق');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resendOtp(): void {
    if (this.resendCooldown > 0) return;
    this.sendOtp();
  }

  // ========== Step 2: Create Admin ==========

  submitCreateAdmin(): void {
    this.clearFieldErrors();

    if (!this.validateForm()) return;

    this.isLoading = true;
    this.usersService.createAdmin(this.createDto).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.toaster.success('تم إنشاء الأدمن بنجاح');
          this.createdAdmin = response.data;
          this.step = 'success';
          this.clearTimers();
        } else {
          this.handleCreateError(response.message || 'فشل إنشاء الأدمن');
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const msg = error.error?.message || error.message || 'فشل إنشاء الأدمن';
        this.handleCreateError(msg);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== Reset ==========

  resetToStart(): void {
    this.step = 'send-otp';
    this.phoneHint = '';
    this.createdAdmin = null;
    this.clearTimers();
    this.resetForm();
    this.cdr.markForCheck();
  }

  // ========== Validation ==========

  private validateForm(): boolean {
    if (!this.createDto.otpCode || this.createDto.otpCode.length !== 4) {
      this.toaster.error('يرجى إدخال كود التحقق (4 أرقام)');
      return false;
    }

    if (!this.createDto.fullName?.trim()) {
      this.toaster.error('يرجى إدخال الاسم الكامل');
      return false;
    }

    if (!this.createDto.email?.trim() || !this.isValidEmail(this.createDto.email)) {
      this.toaster.error('يرجى إدخال بريد إلكتروني صحيح');
      return false;
    }

    if (!this.createDto.phoneNumber?.trim()) {
      this.toaster.error('يرجى إدخال رقم الهاتف');
      return false;
    }

    if (!this.createDto.password || this.createDto.password.length < 6) {
      this.toaster.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return false;
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ========== Error Handling ==========

  private handleCreateError(message: string): void {
    const lower = message.toLowerCase();

    if (lower.includes('otp expired') || lower.includes('not found')) {
      this.toaster.error('كود التحقق انتهت صلاحيته - أعد الإرسال');
      this.otpExpirySeconds = 0;
      this.clearTimers();
    } else if (lower.includes('invalid otp')) {
      this.toaster.error('كود التحقق غير صحيح');
    } else if (lower.includes('phone') && lower.includes('registered')) {
      this.phoneError = 'رقم الهاتف مسجل مسبقاً';
      this.toaster.error(this.phoneError);
    } else if (lower.includes('email') && lower.includes('registered')) {
      this.emailError = 'البريد الإلكتروني مسجل مسبقاً';
      this.toaster.error(this.emailError);
    } else {
      this.toaster.error(message);
    }
  }

  private clearFieldErrors(): void {
    this.phoneError = '';
    this.emailError = '';
  }

  // ========== Timers ==========

  private startOtpTimer(): void {
    this.otpExpirySeconds = 300; // 5 minutes
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    this.otpTimerInterval = setInterval(() => {
      this.otpExpirySeconds--;
      if (this.otpExpirySeconds <= 0) {
        clearInterval(this.otpTimerInterval);
        this.otpTimerInterval = null;
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;
    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);
    this.resendTimerInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendTimerInterval);
        this.resendTimerInterval = null;
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private clearTimers(): void {
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
      this.otpTimerInterval = null;
    }
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
      this.resendTimerInterval = null;
    }
  }

  private resetForm(): void {
    this.createDto = {
      otpCode: '',
      phoneNumber: '',
      password: '',
      fullName: '',
      email: ''
    };
    this.clearFieldErrors();
  }

  // ========== Helpers ==========

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
