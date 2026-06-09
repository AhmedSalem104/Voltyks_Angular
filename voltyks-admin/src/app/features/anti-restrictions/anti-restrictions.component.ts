import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AntiRestrictionsService } from '../../core/services/admin/anti-restrictions.service';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-anti-restrictions',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingOverlayComponent, ConfirmDialogComponent, TranslatePipe],
  templateUrl: './anti-restrictions.component.html',
  styleUrls: ['./anti-restrictions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AntiRestrictionsComponent implements OnInit {
  antiOtpEnabled = false;
  antiPaymentEnabled = false;

  isLoadingOtp = false;
  isLoadingPayment = false;
  isSavingOtp = false;
  isSavingPayment = false;

  loadErrorOtp = false;
  loadErrorPayment = false;

  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogType: 'primary' | 'danger' = 'primary';
  pendingAction: (() => void) | null = null;

  constructor(
    private service: AntiRestrictionsService,
    private toaster: ToasterService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  get isSaving(): boolean {
    return this.isSavingOtp || this.isSavingPayment;
  }

  ngOnInit(): void {
    this.loadOtpConfig();
    this.loadPaymentConfig();
  }

  // ============ Anti-OTP ============

  loadOtpConfig(): void {
    this.isLoadingOtp = true;
    this.loadErrorOtp = false;
    this.cdr.markForCheck();

    this.service.getAntiOtpRestriction().subscribe({
      next: (res: any) => {
        const value =
          res?.data?.antiOtpRestrictionMode ??
          res?.data?.anti_otp_restriction_mode ??
          res?.antiOtpRestrictionMode;
        if (typeof value === 'boolean') {
          this.antiOtpEnabled = value;
        } else {
          this.loadErrorOtp = true;
        }
        this.isLoadingOtp = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadErrorOtp = true;
        this.isLoadingOtp = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleOtp(): void {
    const newStatus = !this.antiOtpEnabled;
    this.confirmDialogTitle = this.translate.instant(
      newStatus ? 'antiRestrictions.otp.confirmActivate' : 'antiRestrictions.otp.confirmDeactivate'
    );
    this.confirmDialogMessage = this.translate.instant(
      newStatus ? 'antiRestrictions.otp.confirmActivateMsg' : 'antiRestrictions.otp.confirmDeactivateMsg'
    );
    this.confirmDialogType = newStatus ? 'danger' : 'primary';
    this.pendingAction = () => this.applyOtpToggle(newStatus);
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private applyOtpToggle(newStatus: boolean): void {
    this.isSavingOtp = true;
    this.cdr.markForCheck();

    this.service.updateAntiOtpRestriction({ enabled: newStatus }).subscribe({
      next: (res: any) => {
        const successKey = newStatus
          ? 'antiRestrictions.otp.successActivated'
          : 'antiRestrictions.otp.successDeactivated';
        if (res?.status) {
          const returned =
            res?.data?.antiOtpRestrictionMode ??
            res?.data?.anti_otp_restriction_mode;
          this.antiOtpEnabled = typeof returned === 'boolean' ? returned : newStatus;
          this.toaster.success(this.translate.instant(successKey));
        } else {
          this.toaster.error(res?.message || this.translate.instant('antiRestrictions.otp.failUpdate'));
        }
        this.isSavingOtp = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toaster.error(err?.error?.message || this.translate.instant('antiRestrictions.otp.failUpdate'));
        this.isSavingOtp = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ============ Anti-Payment ============

  loadPaymentConfig(): void {
    this.isLoadingPayment = true;
    this.loadErrorPayment = false;
    this.cdr.markForCheck();

    this.service.getAntiPaymentRestriction().subscribe({
      next: (res: any) => {
        const value =
          res?.data?.antiPaymentRestrictionMode ??
          res?.data?.anti_payment_restriction_mode ??
          res?.antiPaymentRestrictionMode;
        if (typeof value === 'boolean') {
          this.antiPaymentEnabled = value;
        } else {
          this.loadErrorPayment = true;
        }
        this.isLoadingPayment = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadErrorPayment = true;
        this.isLoadingPayment = false;
        this.cdr.markForCheck();
      }
    });
  }

  togglePayment(): void {
    const newStatus = !this.antiPaymentEnabled;
    this.confirmDialogTitle = this.translate.instant(
      newStatus ? 'antiRestrictions.payment.confirmActivate' : 'antiRestrictions.payment.confirmDeactivate'
    );
    this.confirmDialogMessage = this.translate.instant(
      newStatus ? 'antiRestrictions.payment.confirmActivateMsg' : 'antiRestrictions.payment.confirmDeactivateMsg'
    );
    this.confirmDialogType = newStatus ? 'danger' : 'primary';
    this.pendingAction = () => this.applyPaymentToggle(newStatus);
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private applyPaymentToggle(newStatus: boolean): void {
    this.isSavingPayment = true;
    this.cdr.markForCheck();

    this.service.updateAntiPaymentRestriction({ enabled: newStatus }).subscribe({
      next: (res: any) => {
        const successKey = newStatus
          ? 'antiRestrictions.payment.successActivated'
          : 'antiRestrictions.payment.successDeactivated';
        if (res?.status) {
          const returned =
            res?.data?.antiPaymentRestrictionMode ??
            res?.data?.anti_payment_restriction_mode;
          this.antiPaymentEnabled = typeof returned === 'boolean' ? returned : newStatus;
          this.toaster.success(this.translate.instant(successKey));
        } else {
          this.toaster.error(res?.message || this.translate.instant('antiRestrictions.payment.failUpdate'));
        }
        this.isSavingPayment = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toaster.error(err?.error?.message || this.translate.instant('antiRestrictions.payment.failUpdate'));
        this.isSavingPayment = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ============ Confirm Dialog ============

  confirmAction(): void {
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
    this.showConfirmDialog = false;
    this.cdr.markForCheck();
  }

  cancelAction(): void {
    this.pendingAction = null;
    this.showConfirmDialog = false;
    this.cdr.markForCheck();
  }
}
