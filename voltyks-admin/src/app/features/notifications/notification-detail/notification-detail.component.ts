import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminReportsService } from '../../../core/services/admin/admin-reports.service';
import { AdminComplaintsService } from '../../../core/services/admin/admin-complaints.service';
import { AdminStoreService } from '../../../core/services/admin/admin-store.service';
import { VehicleAdditionRequestsService } from '../../../core/services/admin/vehicle-addition-requests.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DataRefreshService } from '../../../core/services/data-refresh.service';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { VehicleRequestAcceptModalComponent } from '../../../shared/components/vehicle-request-accept-modal/vehicle-request-accept-modal.component';
import { NotificationType } from '../../../core/models/notification.model';
import { AcceptVehicleRequestBody } from '../../../core/models';

@Component({
  selector: 'app-notification-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmDialogComponent, VehicleRequestAcceptModalComponent, TranslatePipe],
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

  // Vehicle accept modal
  showVehicleAcceptModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reportsService: AdminReportsService,
    private complaintsService: AdminComplaintsService,
    private storeService: AdminStoreService,
    private vehicleRequestsService: VehicleAdditionRequestsService,
    private notificationService: NotificationService,
    private refreshService: DataRefreshService,
    private toaster: ToasterService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

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
    this.showVehicleAcceptModal = true;
    this.cdr.markForCheck();
  }

  onVehicleAcceptModalConfirm(body: AcceptVehicleRequestBody): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.vehicleRequestsService.accept(this.id, body).subscribe({
      next: (response) => {
        if (response?.status) {
          this.toaster.success(response.message || this.t('notifications.detail.acceptSuccess'));
          this.showVehicleAcceptModal = false;
          this.notificationService.loadVehicleRequestNotifications();
          this.refreshService.emit('vehicle-request');
          this.refreshService.emit('brand');
          this.refreshService.emit('model');
          this.closeDetail();
        } else {
          this.toaster.error(response?.message || this.t('notifications.detail.acceptFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || this.t('notifications.detail.acceptFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  onVehicleAcceptModalCancel(): void {
    if (this.isSaving) return;
    this.showVehicleAcceptModal = false;
    this.cdr.markForCheck();
  }

  declineVehicleRequest(): void {
    if (!this.vehicleRequest) return;
    this.confirmDialogTitle = this.t('notifications.detail.declineTitle');
    this.confirmDialogMessage = this.t('notifications.detail.declineConfirm', {
      brand: this.vehicleRequest.brandName,
      model: this.vehicleRequest.modelName
    });
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
          this.toaster.success(response.message || this.t('notifications.detail.declineSuccess'));
          this.notificationService.loadVehicleRequestNotifications();
          this.refreshService.emit('vehicle-request');
          this.closeDetail();
        } else {
          this.toaster.error(response?.message || this.t('notifications.detail.declineFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || this.t('notifications.detail.declineFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Close the detail page by going back to the previous screen.
   * Falls back to the resource's list page if there's no history.
   */
  private closeDetail(): void {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    const fallback: Record<string, string> = {
      'report': '/reports',
      'complaint': '/complaints',
      'reservation': '/store/reservations',
      'vehicle-request': '/vehicle-addition-requests'
    };
    this.router.navigate([fallback[this.type] || '/dashboard']);
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
    this.confirmDialogTitle = this.t('notifications.detail.resolveReportTitle');
    this.confirmDialogMessage = this.t('notifications.detail.resolveReportConfirm');
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
          this.toaster.success(this.t('notifications.detail.resolveReportSuccess'));
          this.refreshService.emit('report');
          this.closeDetail();
        } else {
          this.toaster.error(response.message || this.t('notifications.detail.resolveReportFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.toaster.error(this.t('notifications.detail.resolveReportFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteReport(): void {
    this.confirmDialogTitle = this.t('notifications.detail.deleteReportTitle');
    this.confirmDialogMessage = this.t('notifications.detail.deleteReportConfirm');
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
          this.toaster.success(this.t('notifications.detail.deleteReportSuccess'));
          this.refreshService.emit('report');
          this.closeDetail();
        } else {
          this.toaster.error(response.message || this.t('notifications.detail.deleteReportFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.toaster.error(this.t('notifications.detail.deleteReportFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== Complaint Actions ==========

  resolveComplaint(): void {
    this.confirmDialogTitle = this.t('notifications.detail.resolveComplaintTitle');
    this.confirmDialogMessage = this.t('notifications.detail.resolveComplaintConfirm');
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
          this.toaster.success(this.t('notifications.detail.resolveComplaintSuccess'));
          this.refreshService.emit('complaint');
          this.closeDetail();
        } else {
          this.toaster.error(response.message || this.t('notifications.detail.resolveComplaintFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.toaster.error(this.t('notifications.detail.resolveComplaintFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  addReply(): void {
    if (!this.replyContent.trim()) {
      this.toaster.warning(this.t('notifications.detail.enterReplyContent'));
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    this.complaintsService.addReply(this.id, { content: this.replyContent }).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.t('notifications.detail.replySuccess'));
          this.replyContent = '';
          this.refreshService.emit('complaint');
          this.loadComplaint(); // Reload to show the reply inline (stay on page for reply context)
        } else {
          this.toaster.error(response.message || this.t('notifications.detail.replyFail'));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error(this.t('notifications.detail.replyFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== Reservation Actions ==========

  updateReservationStatus(status: string): void {
    const label = this.t(`notifications.detail.reservationStatus.${status}`);
    this.confirmDialogTitle = this.t('notifications.detail.reservationStatusTitle');
    this.confirmDialogMessage = this.t('notifications.detail.reservationStatusConfirm', { label });
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
          this.toaster.success(this.t('notifications.detail.reservationStatusSuccess'));
          this.refreshService.emit('reservation');
          this.closeDetail();
        } else {
          this.toaster.error(response.message || this.t('notifications.detail.reservationStatusFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.toaster.error(this.t('notifications.detail.reservationStatusFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  updatePaymentStatus(status: string): void {
    const label = this.t(`notifications.detail.paymentStatus.${status}`);
    this.confirmDialogTitle = this.t('notifications.detail.paymentStatusTitle');
    this.confirmDialogMessage = this.t('notifications.detail.paymentStatusConfirm', { label });
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
          this.toaster.success(this.t('notifications.detail.paymentStatusSuccess'));
          this.refreshService.emit('reservation');
          this.closeDetail();
        } else {
          this.toaster.error(response.message || this.t('notifications.detail.paymentStatusFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.toaster.error(this.t('notifications.detail.paymentStatusFail'));
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
      case 'report': return this.t('notifications.detail.types.report');
      case 'complaint': return this.t('notifications.detail.types.complaint');
      case 'reservation': return this.t('notifications.detail.types.reservation');
      case 'vehicle-request': return this.t('notifications.detail.types.vehicleRequest');
      default: return this.t('notifications.detail.types.generic');
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
    const key = `notifications.detail.vehicleStatus.${status}`;
    const translated = this.t(key);
    return translated === key ? status : translated;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(this.translate.currentLang === 'en' ? 'en-US' : 'ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return amount?.toLocaleString('en-US') + ' ' + this.t('common.currency');
  }

  getReservationStatusLabel(status: string): string {
    const key = `notifications.detail.reservationStatus.${status}`;
    const translated = this.t(key);
    return translated === key ? status : translated;
  }

  getPaymentStatusLabel(status: string): string {
    const key = `notifications.detail.paymentStatus.${status}`;
    const translated = this.t(key);
    return translated === key ? status : translated;
  }
}
