import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AppConfigService } from '../../core/services/admin/app-config.service';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { AdminMobileConfigDto, UpdateAdminMobileConfigDto } from '../../core/models';

@Component({
  selector: 'app-app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingOverlayComponent, ConfirmDialogComponent, TranslatePipe],
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

  // Charging Mode State
  chargingModeEnabled = false;
  isChargingModeLoading = false;
  isChargingModeSaving = false;
  chargingModeLoadError = false;

  // Confirm dialog state
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  pendingAction: (() => void) | null = null;

  constructor(
    private appConfigService: AppConfigService,
    private toaster: ToasterService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.loadConfig();
    this.loadChargingModeConfig();
  }

  loadConfig(): void {
    this.isLoading = true;
    this.loadError = false;

    this.appConfigService.getAdminMobileConfig().subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.config = this.normalizeMobileConfig(res.data);
          this.syncFormWithConfig();
          this.hasChanges = false;
        } else {
          this.loadError = true;
          this.toaster.error(res.message || this.t('appConfig.toast.loadFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = true;
        this.toaster.error(err.error?.message || this.t('appConfig.toast.loadFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Normalize response data to handle both camelCase (from interceptor)
   * and snake_case field names from the API
   */
  private normalizeMobileConfig(data: any): AdminMobileConfigDto {
    return {
      android_enabled: data.android_enabled ?? data.androidEnabled ?? false,
      ios_enabled: data.ios_enabled ?? data.iosEnabled ?? false,
      android_min_version: data.android_min_version ?? data.androidMinVersion ?? null,
      ios_min_version: data.ios_min_version ?? data.iosMinVersion ?? null
    };
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
    const actionText = this.t(newStatus ? 'appConfig.toast.enableActionVerb' : 'appConfig.toast.disableActionVerb');

    this.confirmDialogTitle = `${actionText} ${platformName}`;
    this.confirmDialogMessage = this.t(
      newStatus ? 'appConfig.toast.platformConfirmEnable' : 'appConfig.toast.platformConfirmDisable',
      { platform: platformName }
    );

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

    // Send snake_case keys (backend uses [JsonPropertyName] with snake_case)
    const updateDto: UpdateAdminMobileConfigDto = {
      android_enabled: this.formConfig.android_enabled ?? false,
      ios_enabled: this.formConfig.ios_enabled ?? false,
      android_min_version: this.formConfig.android_min_version || null,
      ios_min_version: this.formConfig.ios_min_version || null
    };

    this.appConfigService.updateAdminMobileConfig(updateDto).subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.config = this.normalizeMobileConfig(res.data);
          this.syncFormWithConfig();
          this.hasChanges = false;
          this.toaster.success(this.t('appConfig.toast.saveSuccess'));
        } else {
          this.toaster.error(res.message || this.t('appConfig.toast.saveFail'));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.error?.message || this.t('appConfig.toast.saveFail'));
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
    return this.t(enabled ? 'appConfig.enabledLabel' : 'appConfig.disabledLabel');
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

  // ============ Charging Mode Methods ============

  loadChargingModeConfig(): void {
    this.isChargingModeLoading = true;
    this.chargingModeLoadError = false;

    this.appConfigService.getAdminChargingMode().subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.chargingModeEnabled = res.data.enabled ?? res.data.chargingModeEnabled ?? res.data.charging_mode_enabled ?? false;
        } else if (res.enabled !== undefined) {
          this.chargingModeEnabled = res.enabled;
        } else {
          this.chargingModeLoadError = true;
        }
        this.isChargingModeLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.chargingModeLoadError = true;
        this.isChargingModeLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleChargingMode(): void {
    const newStatus = !this.chargingModeEnabled;
    const actionText = this.t(newStatus ? 'appConfig.toast.enableActionVerb' : 'appConfig.toast.disableActionVerb');

    this.confirmDialogTitle = this.t('appConfig.toast.chargingModeAction', { action: actionText });
    this.confirmDialogMessage = this.t(
      newStatus ? 'appConfig.toast.chargingModeConfirmEnable' : 'appConfig.toast.chargingModeConfirmDisable'
    );

    this.pendingAction = () => this.confirmChargingModeToggle(newStatus);
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmChargingModeToggle(newStatus: boolean): void {
    this.isChargingModeSaving = true;
    this.cdr.markForCheck();

    this.appConfigService.updateAdminChargingMode({ enabled: newStatus }).subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.chargingModeEnabled = res.data.enabled ?? res.data.chargingModeEnabled ?? res.data.charging_mode_enabled ?? newStatus;
          this.toaster.success(this.t(newStatus ? 'appConfig.toast.chargingModeEnabledToast' : 'appConfig.toast.chargingModeDisabledToast'));
        } else if (res.status) {
          // Response has status but no data - use the intended value
          this.chargingModeEnabled = newStatus;
          this.toaster.success(this.t(newStatus ? 'appConfig.toast.chargingModeEnabledToast' : 'appConfig.toast.chargingModeDisabledToast'));
        } else {
          this.toaster.error(res.message || this.t('appConfig.toast.chargingModeFail'));
        }
        this.isChargingModeSaving = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toaster.error(err.error?.message || this.t('appConfig.toast.chargingModeFail'));
        this.isChargingModeSaving = false;
        this.cdr.markForCheck();
      }
    });
  }
}
