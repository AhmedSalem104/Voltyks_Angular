import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminReportsService } from '../../../core/services/admin/admin-reports.service';
import { AdminComplaintsService } from '../../../core/services/admin/admin-complaints.service';
import { AdminStoreService } from '../../../core/services/admin/admin-store.service';
import { VehicleAdditionRequestsService } from '../../../core/services/admin/vehicle-addition-requests.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationType } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './notification-detail.component.html',
  styleUrls: ['./notification-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDetailComponent implements OnInit, OnDestroy {
  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();
  type: NotificationType = 'complaint';
  id: number = 0;

  // Loading states
  isLoading = true;
  isSaving = false;
  loadError = false;

  // Data
  report: any = null;
  complaint: any = null;
  reservation: any = null;
  vehicleRequest: any = null;

  // Complaint reply
  replyContent = '';

  // Confirm dialog
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  pendingAction: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reportsService: AdminReportsService,
    private complaintsService: AdminComplaintsService,
    private storeService: AdminStoreService,
    private vehicleRequestsService: VehicleAdditionRequestsService,
    private notificationService: NotificationService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.type = params['type'] as NotificationType;
      this.id = +params['id'];
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    this.loadError = false;
    this.cdr.markForCheck();

    switch (this.type) {
      case 'report':
        this.loadReport();
        break;
      case 'complaint':
        this.loadComplaint();
        break;
      case 'reservation':
        this.loadReservation();
        break;
      case 'vehicle-request':
        this.loadVehicleRequest();
        break;
      default:
        this.loadError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
    }
  }

  private loadVehicleRequest(): void {
    this.vehicleRequestsService.getById(this.id).subscribe({
      next: (response) => {
        if (response?.status && response.data) {
          this.vehicleRequest = response.data;
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

  // ========== Vehicle Request Actions ==========

  acceptVehicleRequest(): void {
    if (!this.vehicleRequest) return;
    this.confirmDialogTitle = 'قبول الطلب';
    this.confirmDialogMessage =
      `هل أنت متأكد من قبول طلب إضافة السيارة "${this.vehicleRequest.brandName} ${this.vehicleRequest.modelName}"؟ سيتم إضافتها إلى قاعدة البيانات.`;
    this.pendingAction = () => this.confirmAcceptVehicleRequest();
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmAcceptVehicleRequest(): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.vehicleRequestsService.accept(this.id).subscribe({
      next: (response) => {
        if (response?.status) {
          this.toaster.success(response.message || 'تم قبول الطلب وإضافة السيارة بنجاح');
          this.loadVehicleRequest();
          this.notificationService.loadVehicleRequestNotifications();
        } else {
          this.toaster.error(response?.message || 'فشل قبول الطلب');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || 'فشل قبول الطلب');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  declineVehicleRequest(): void {
    if (!this.vehicleRequest) return;
    this.confirmDialogTitle = 'رفض الطلب';
    this.confirmDialogMessage =
      `هل أنت متأكد من رفض طلب إضافة السيارة "${this.vehicleRequest.brandName} ${this.vehicleRequest.modelName}"؟`;
    this.pendingAction = () => this.confirmDeclineVehicleRequest();
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmDeclineVehicleRequest(): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.vehicleRequestsService.decline(this.id).subscribe({
      next: (response) => {
        if (response?.status) {
          this.toaster.success(response.message || 'تم رفض الطلب');
          this.loadVehicleRequest();
          this.notificationService.loadVehicleRequestNotifications();
        } else {
          this.toaster.error(response?.message || 'فشل رفض الطلب');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || 'فشل رفض الطلب');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadReport(): void {
    this.reportsService.getReportById(this.id).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.report = response.data;
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

  private loadComplaint(): void {
    this.complaintsService.getComplaintById(this.id).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.complaint = response.data;
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

  private loadReservation(): void {
    this.storeService.getReservationById(this.id).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.reservation = response.data;
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

  // ========== Report Actions ==========

  resolveReport(): void {
    this.confirmDialogTitle = 'حل البلاغ';
    this.confirmDialogMessage = 'هل أنت متأكد من حل هذا البلاغ؟';
    this.pendingAction = () => this.confirmResolveReport();
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmResolveReport(): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.reportsService.resolveReport(this.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.report.isResolved = true;
          this.toaster.success('تم حل البلاغ بنجاح');
        } else {
          this.toaster.error(response.message || 'فشل حل البلاغ');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('فشل حل البلاغ');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteReport(): void {
    this.confirmDialogTitle = 'حذف البلاغ';
    this.confirmDialogMessage = 'هل أنت متأكد من حذف هذا البلاغ؟ لا يمكن التراجع عن هذا الإجراء.';
    this.pendingAction = () => this.confirmDeleteReport();
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmDeleteReport(): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.reportsService.deleteReport(this.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف البلاغ بنجاح');
          this.router.navigate(['/reports']);
        } else {
          this.toaster.error(response.message || 'فشل حذف البلاغ');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('فشل حذف البلاغ');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== Complaint Actions ==========

  resolveComplaint(): void {
    this.confirmDialogTitle = 'حل الشكوى';
    this.confirmDialogMessage = 'هل أنت متأكد من حل هذه الشكوى؟';
    this.pendingAction = () => this.confirmResolveComplaint();
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmResolveComplaint(): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.complaintsService.resolveComplaint(this.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.complaint.isResolved = true;
          this.toaster.success('تم حل الشكوى بنجاح');
        } else {
          this.toaster.error(response.message || 'فشل حل الشكوى');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('فشل حل الشكوى');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  addReply(): void {
    if (!this.replyContent.trim()) {
      this.toaster.warning('الرجاء إدخال محتوى الرد');
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    this.complaintsService.addReply(this.id, { content: this.replyContent }).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة الرد بنجاح');
          this.replyContent = '';
          this.loadComplaint(); // Reload to get updated replies
        } else {
          this.toaster.error(response.message || 'فشل إضافة الرد');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('فشل إضافة الرد');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== Reservation Actions ==========

  updateReservationStatus(status: string): void {
    const statusLabels: { [key: string]: string } = {
      'pending': 'قيد الانتظار',
      'contacted': 'تم التواصل',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };

    this.confirmDialogTitle = 'تغيير حالة الحجز';
    this.confirmDialogMessage = `هل أنت متأكد من تغيير حالة الحجز إلى "${statusLabels[status]}"؟`;
    this.pendingAction = () => this.confirmUpdateReservationStatus(status);
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmUpdateReservationStatus(status: string): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.updateReservationStatus(this.id, status).subscribe({
      next: (response) => {
        if (response.status) {
          this.reservation.status = status;
          this.toaster.success('تم تحديث حالة الحجز بنجاح');
        } else {
          this.toaster.error(response.message || 'فشل تحديث حالة الحجز');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('فشل تحديث حالة الحجز');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  updatePaymentStatus(status: string): void {
    const statusLabels: { [key: string]: string } = {
      'pending': 'في انتظار الدفع',
      'paid': 'مدفوع',
      'refunded': 'مسترد'
    };

    this.confirmDialogTitle = 'تغيير حالة الدفع';
    this.confirmDialogMessage = `هل أنت متأكد من تغيير حالة الدفع إلى "${statusLabels[status]}"؟`;
    this.pendingAction = () => this.confirmUpdatePaymentStatus(status);
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private confirmUpdatePaymentStatus(status: string): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.updatePaymentStatus(this.id, status).subscribe({
      next: (response) => {
        if (response.status) {
          this.reservation.paymentStatus = status;
          this.toaster.success('تم تحديث حالة الدفع بنجاح');
        } else {
          this.toaster.error(response.message || 'فشل تحديث حالة الدفع');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('فشل تحديث حالة الدفع');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== Dialog Actions ==========

  confirmAction(): void {
    this.showConfirmDialog = false;
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
  }

  cancelAction(): void {
    this.showConfirmDialog = false;
    this.pendingAction = null;
    this.cdr.markForCheck();
  }

  // ========== Helpers ==========

  goBack(): void {
    this.router.navigate(['/']);
  }

  getTypeLabel(): string {
    switch (this.type) {
      case 'report': return 'بلاغ';
      case 'complaint': return 'شكوى';
      case 'reservation': return 'حجز منتج';
      case 'vehicle-request': return 'طلب إضافة سيارة';
      default: return 'إشعار';
    }
  }

  getTypeIcon(): string {
    switch (this.type) {
      case 'report': return 'report_problem';
      case 'complaint': return 'feedback';
      case 'reservation': return 'shopping_cart';
      case 'vehicle-request': return 'directions_car';
      default: return 'notifications';
    }
  }

  getVehicleRequestStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'accepted': return 'مقبولة';
      case 'declined': return 'مرفوضة';
      default: return status;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return amount?.toLocaleString('en-US') + ' ج.م';
  }

  getReservationStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'قيد الانتظار',
      'contacted': 'تم التواصل',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };
    return labels[status] || status;
  }

  getPaymentStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'في انتظار الدفع',
      'paid': 'مدفوع',
      'refunded': 'مسترد'
    };
    return labels[status] || status;
  }
}
