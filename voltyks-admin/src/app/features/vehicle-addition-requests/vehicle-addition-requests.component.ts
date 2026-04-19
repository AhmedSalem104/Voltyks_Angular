import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { VehicleAdditionRequestsService } from '../../core/services/admin/vehicle-addition-requests.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import {
  VehicleAdditionRequestDto,
  VehicleAdditionRequestStatus
} from '../../core/models';

type StatusFilter = 'all' | VehicleAdditionRequestStatus;

@Component({
  selector: 'app-vehicle-addition-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './vehicle-addition-requests.component.html',
  styleUrls: ['./vehicle-addition-requests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleAdditionRequestsComponent implements OnInit, OnDestroy {
  items: VehicleAdditionRequestDto[] = [];
  totalCount = 0;
  totalPages = 1;
  currentPage = 1;
  pageSize = 20;

  filter: StatusFilter = 'pending';
  isLoading = false;
  loadError = false;

  // Row action state
  processingId: number | null = null;

  // Details modal
  showDetailsModal = false;
  selectedRequest: VehicleAdditionRequestDto | null = null;

  // Confirm dialog
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogType: 'primary' | 'danger' = 'primary';
  pendingAction: (() => void) | null = null;

  private subscriptions: Subscription[] = [];

  readonly filterOptions: { key: StatusFilter; label: string; icon: string }[] = [
    { key: 'pending', label: 'قيد الانتظار', icon: 'hourglass_empty' },
    { key: 'accepted', label: 'مقبولة', icon: 'check_circle' },
    { key: 'declined', label: 'مرفوضة', icon: 'cancel' },
    { key: 'all', label: 'الكل', icon: 'list' }
  ];

  constructor(
    private requestsService: VehicleAdditionRequestsService,
    private notificationService: NotificationService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();

    // Real-time: refetch list whenever a new notification arrives
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(() => {
        this.loadData(true);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  loadData(silent = false): void {
    if (!silent) {
      this.isLoading = true;
      this.loadError = false;
      this.cdr.markForCheck();
    }

    const statusParam: VehicleAdditionRequestStatus | null =
      this.filter === 'all' ? null : this.filter;

    this.requestsService.getAll(statusParam, this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        if (res?.status && res.data) {
          this.items = res.data.items ?? [];
          this.totalCount = res.data.totalCount ?? 0;
          this.totalPages = res.data.totalPages ?? 1;
        } else {
          this.loadError = !silent;
          if (!silent) this.toaster.error(res?.message || 'فشل تحميل الطلبات');
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = !silent;
        this.isLoading = false;
        if (!silent) this.toaster.error(err?.error?.message || 'فشل تحميل الطلبات');
        this.cdr.markForCheck();
      }
    });
  }

  setFilter(filter: StatusFilter): void {
    if (this.filter === filter) return;
    this.filter = filter;
    this.currentPage = 1;
    this.loadData();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadData();
  }

  openDetails(req: VehicleAdditionRequestDto): void {
    this.selectedRequest = req;
    this.showDetailsModal = true;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedRequest = null;
    this.cdr.markForCheck();
  }

  requestAccept(req: VehicleAdditionRequestDto): void {
    this.confirmDialogTitle = 'قبول الطلب';
    this.confirmDialogMessage =
      `هل أنت متأكد من قبول طلب إضافة السيارة "${req.brandName} ${req.modelName}" للمستخدم "${req.userFullName}"؟ سيتم إضافتها إلى قاعدة البيانات.`;
    this.confirmDialogType = 'primary';
    this.pendingAction = () => this.doAccept(req.id);
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  requestDecline(req: VehicleAdditionRequestDto): void {
    this.confirmDialogTitle = 'رفض الطلب';
    this.confirmDialogMessage =
      `هل أنت متأكد من رفض طلب إضافة السيارة "${req.brandName} ${req.modelName}" للمستخدم "${req.userFullName}"؟`;
    this.confirmDialogType = 'danger';
    this.pendingAction = () => this.doDecline(req.id);
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

  private doAccept(id: number): void {
    this.processingId = id;
    this.cdr.markForCheck();

    this.requestsService.accept(id).subscribe({
      next: (res) => {
        if (res?.status) {
          this.toaster.success(res.message || 'تم قبول الطلب وإضافة السيارة بنجاح');
          this.closeDetails();
          this.loadData();
          this.notificationService.loadVehicleRequestNotifications();
        } else {
          this.toaster.error(res?.message || 'فشل قبول الطلب');
        }
        this.processingId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || 'فشل قبول الطلب');
        this.processingId = null;
        this.cdr.markForCheck();
      }
    });
  }

  private doDecline(id: number): void {
    this.processingId = id;
    this.cdr.markForCheck();

    this.requestsService.decline(id).subscribe({
      next: (res) => {
        if (res?.status) {
          this.toaster.success(res.message || 'تم رفض الطلب');
          this.closeDetails();
          this.loadData();
          this.notificationService.loadVehicleRequestNotifications();
        } else {
          this.toaster.error(res?.message || 'فشل رفض الطلب');
        }
        this.processingId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || 'فشل رفض الطلب');
        this.processingId = null;
        this.cdr.markForCheck();
      }
    });
  }

  getStatusClass(status: VehicleAdditionRequestStatus): string {
    return `status-${status}`;
  }

  getStatusLabel(status: VehicleAdditionRequestStatus): string {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'accepted': return 'مقبولة';
      case 'declined': return 'مرفوضة';
      default: return status;
    }
  }

  trackById(_: number, item: VehicleAdditionRequestDto): number {
    return item.id;
  }
}
