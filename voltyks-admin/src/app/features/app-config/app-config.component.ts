import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppConfigService } from '../../core/services/admin/app-config.service';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-app-config',
  standalone: true,
  imports: [CommonModule, LoadingOverlayComponent, ConfirmDialogComponent],
  templateUrl: './app-config.component.html',
  styleUrls: ['./app-config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppConfigComponent implements OnInit {
  isLoading = false;
  loadError = false;
  mobileAppEnabled: boolean | null = null;
  showConfirmDialog = false;
  pendingStatus = false;

  constructor(
    private appConfigService: AppConfigService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus(): void {
    this.isLoading = true;
    this.loadError = false;

    this.appConfigService.getMobileAppStatus().subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.mobileAppEnabled = res.data.mobile_app_enabled;
        } else {
          this.loadError = true;
          this.toaster.error(res.message || 'فشل تحميل حالة التطبيق');
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.loadError = true;
        this.toaster.error(err.error?.message || 'فشل تحميل حالة التطبيق');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openConfirmDialog(newStatus: boolean): void {
    this.pendingStatus = newStatus;
    this.showConfirmDialog = true;
  }

  confirmToggle(): void {
    this.showConfirmDialog = false;
    this.isLoading = true;

    this.appConfigService.updateMobileAppStatus({ mobile_app_enabled: this.pendingStatus }).subscribe({
      next: (res) => {
        if (res.status) {
          this.mobileAppEnabled = res.data.mobile_app_enabled;
          const statusText = this.mobileAppEnabled ? 'تفعيل' : 'إيقاف';
          this.toaster.success(`تم ${statusText} تطبيق الموبايل بنجاح`);
        } else {
          this.toaster.error(res.message || 'فشل تحديث حالة التطبيق');
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'فشل تحديث حالة التطبيق');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get statusText(): string {
    return this.mobileAppEnabled ? 'مفعل' : 'متوقف';
  }

  get statusClass(): string {
    return this.mobileAppEnabled ? 'status-active' : 'status-inactive';
  }

  get confirmMessage(): string {
    if (this.pendingStatus) {
      return 'هل أنت متأكد من تفعيل تطبيق الموبايل؟ سيتمكن المستخدمون من استخدام التطبيق.';
    } else {
      return 'هل أنت متأكد من إيقاف تطبيق الموبايل؟ لن يتمكن المستخدمون من الوصول إلى التطبيق.';
    }
  }
}
