import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AdminsModeService } from '../../core/services/admin/admins-mode.service';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-admins-mode',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingOverlayComponent, ConfirmDialogComponent, TranslatePipe],
  templateUrl: './admins-mode.component.html',
  styleUrls: ['./admins-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminsModeComponent implements OnInit {
  adminsModeActivated = false;
  isLoading = false;
  isSaving = false;
  loadError = false;

  // Confirm dialog state
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  pendingAction: (() => void) | null = null;

  constructor(
    private adminsModeService: AdminsModeService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAdminsModeConfig();
  }

  loadAdminsModeConfig(): void {
    this.isLoading = true;
    this.loadError = false;

    this.adminsModeService.getAdminsMode().subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.adminsModeActivated = res.data.adminsModeActivated ?? res.data.admins_mode_activated ?? false;
        } else if (res.adminsModeActivated !== undefined) {
          this.adminsModeActivated = res.adminsModeActivated;
        } else {
          this.loadError = true;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleAdminsMode(): void {
    const newStatus = !this.adminsModeActivated;
    const actionText = newStatus ? 'تفعيل' : 'تعطيل';

    this.confirmDialogTitle = `${actionText} وضع المسؤولين`;
    this.confirmDialogMessage = newStatus
      ? 'هل أنت متأكد من تفعيل وضع المسؤولين؟ سيتم إغلاق التسجيل للمستخدمين الجدد ولن يتمكن أي شخص من إنشاء حساب جديد.'
      : 'هل أنت متأكد من تعطيل وضع المسؤولين؟ سيتم فتح التسجيل للمستخدمين الجدد.';

    this.pendingAction = () => this.confirmAdminsModeToggle(newStatus);
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

  private confirmAdminsModeToggle(newStatus: boolean): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.adminsModeService.updateAdminsMode({ activated: newStatus }).subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.adminsModeActivated = res.data.adminsModeActivated ?? res.data.admins_mode_activated ?? newStatus;
          this.toaster.success(newStatus ? 'تم تفعيل وضع المسؤولين — التسجيل مغلق' : 'تم تعطيل وضع المسؤولين — التسجيل مفتوح');
        } else if (res.status) {
          this.adminsModeActivated = newStatus;
          this.toaster.success(newStatus ? 'تم تفعيل وضع المسؤولين — التسجيل مغلق' : 'تم تعطيل وضع المسؤولين — التسجيل مفتوح');
        } else {
          this.toaster.error(res.message || 'فشل تحديث وضع المسؤولين');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toaster.error(err.error?.message || 'فشل تحديث وضع المسؤولين');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }
}
