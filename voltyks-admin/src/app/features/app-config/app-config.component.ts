import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppConfigService } from '../../core/services/admin/app-config.service';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { AdminMobileConfigDto, UpdateAdminMobileConfigDto } from '../../core/models';

@Component({
  selector: 'app-app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingOverlayComponent, ConfirmDialogComponent],
  templateUrl: './app-config.component.html',
  styleUrls: ['./app-config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppConfigComponent implements OnInit {
  isLoading = false;
  isSaving = false;
  loadError = false;
  hasChanges = false;

  // Current config from server
  config: AdminMobileConfigDto | null = null;

  // Form state for editing
  formConfig: UpdateAdminMobileConfigDto = {
    android_enabled: false,
    ios_enabled: false,
    android_min_version: null,
    ios_min_version: null
  };

  // Confirm dialog state
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  pendingAction: (() => void) | null = null;

  constructor(
    private appConfigService: AppConfigService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.isLoading = true;
    this.loadError = false;

    this.appConfigService.getAdminMobileConfig().subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.config = res.data;
          this.syncFormWithConfig();
          this.hasChanges = false;
        } else {
          this.loadError = true;
          this.toaster.error(res.message || 'فشل تحميل الإعدادات');
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = true;
        this.toaster.error(err.error?.message || 'فشل تحميل الإعدادات');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private syncFormWithConfig(): void {
    if (this.config) {
      this.formConfig = {
        android_enabled: this.config.android_enabled,
        ios_enabled: this.config.ios_enabled,
        android_min_version: this.config.android_min_version,
        ios_min_version: this.config.ios_min_version
      };
    }
  }

  onFormChange(): void {
    this.hasChanges = this.detectChanges();
    this.cdr.markForCheck();
  }

  private detectChanges(): boolean {
    if (!this.config) return false;
    return (
      this.formConfig.android_enabled !== this.config.android_enabled ||
      this.formConfig.ios_enabled !== this.config.ios_enabled ||
      this.formConfig.android_min_version !== this.config.android_min_version ||
      this.formConfig.ios_min_version !== this.config.ios_min_version
    );
  }

  togglePlatform(platform: 'android' | 'ios'): void {
    const currentStatus = platform === 'android'
      ? this.formConfig.android_enabled
      : this.formConfig.ios_enabled;

    const newStatus = !currentStatus;
    const platformName = platform === 'android' ? 'Android' : 'iOS';
    const actionText = newStatus ? 'تفعيل' : 'تعطيل';

    this.confirmDialogTitle = `${actionText} ${platformName}`;
    this.confirmDialogMessage = newStatus
      ? `هل أنت متأكد من تفعيل تطبيق ${platformName}؟`
      : `هل أنت متأكد من تعطيل تطبيق ${platformName}؟ لن يتمكن مستخدمو ${platformName} من الوصول.`;

    this.pendingAction = () => {
      if (platform === 'android') {
        this.formConfig.android_enabled = newStatus;
      } else {
        this.formConfig.ios_enabled = newStatus;
      }
      this.onFormChange();
    };

    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

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

  saveChanges(): void {
    if (!this.hasChanges) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    const updateDto: UpdateAdminMobileConfigDto = {
      android_enabled: this.formConfig.android_enabled,
      ios_enabled: this.formConfig.ios_enabled,
      android_min_version: this.formConfig.android_min_version || null,
      ios_min_version: this.formConfig.ios_min_version || null
    };

    this.appConfigService.updateAdminMobileConfig(updateDto).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.config = res.data;
          this.syncFormWithConfig();
          this.hasChanges = false;
          this.toaster.success('تم حفظ الإعدادات بنجاح');
        } else {
          this.toaster.error(res.message || 'فشل حفظ الإعدادات');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'فشل حفظ الإعدادات');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  discardChanges(): void {
    this.syncFormWithConfig();
    this.hasChanges = false;
    this.cdr.markForCheck();
  }

  getStatusText(enabled: boolean | undefined): string {
    return enabled ? 'مفعّل' : 'معطّل';
  }

  getStatusClass(enabled: boolean | undefined): string {
    return enabled ? 'status-active' : 'status-inactive';
  }

  isValidVersion(version: string | null | undefined): boolean {
    if (!version) return true; // Empty is valid (no minimum)
    // Semantic version pattern: X.Y.Z
    const pattern = /^\d+\.\d+\.\d+$/;
    return pattern.test(version);
  }
}
