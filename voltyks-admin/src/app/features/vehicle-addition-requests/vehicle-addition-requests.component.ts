import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { VehicleAdditionRequestsService } from '../../core/services/admin/vehicle-addition-requests.service';
import { NotificationService } from '../../core/services/notification.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { VehicleRequestAcceptModalComponent } from '../../shared/components/vehicle-request-accept-modal/vehicle-request-accept-modal.component';
import {
  VehicleAdditionRequestDto,
  VehicleAdditionRequestStatus,
  AcceptVehicleRequestBody
} from '../../core/models';

type StatusFilter = 'all' | VehicleAdditionRequestStatus;

@Component({
  selector: 'app-vehicle-addition-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, PaginationComponent, VehicleRequestAcceptModalComponent, TranslatePipe],
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

  // Accept modal (new — with preview + editable fields)
  showAcceptModal = false;
  acceptModalRequest: VehicleAdditionRequestDto | null = null;

  // Confirm dialog
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogType: 'primary' | 'danger' = 'primary';
  pendingAction: (() => void) | null = null;

  private subscriptions: Subscription[] = [];

  readonly filterOptions: { key: StatusFilter; labelKey: string; icon: string }[] = [
    { key: 'pending', labelKey: 'vehicleRequests.filters.pending', icon: 'hourglass_empty' },
    { key: 'accepted', labelKey: 'vehicleRequests.filters.accepted', icon: 'check_circle' },
    { key: 'declined', labelKey: 'vehicleRequests.filters.declined', icon: 'cancel' },
    { key: 'all', labelKey: 'vehicleRequests.filters.all', icon: 'list' }
  ];

  constructor(
    private requestsService: VehicleAdditionRequestsService,
    private notificationService: NotificationService,
    private refreshService: DataRefreshService,
    private toaster: ToasterService,
    private translate: TranslateService,
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

    // Auto-refresh when any vehicle-request action happens anywhere in the app
    this.subscriptions.push(
      this.refreshService.on('vehicle-request').subscribe(() => {
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
          if (!silent) this.toaster.error(res?.message || this.translate.instant('vehicleRequests.table.loadError'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = !silent;
        this.isLoading = false;
        if (!silent) this.toaster.error(err?.error?.message || this.translate.instant('vehicleRequests.table.loadError'));
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
    this.acceptModalRequest = req;
    this.showAcceptModal = true;
    this.cdr.markForCheck();
  }

  onAcceptModalConfirm(body: AcceptVehicleRequestBody): void {
    if (!this.acceptModalRequest) return;
    this.doAccept(this.acceptModalRequest.id, body);
  }

  onAcceptModalCancel(): void {
    this.showAcceptModal = false;
    this.acceptModalRequest = null;
    this.cdr.markForCheck();
  }

  requestDecline(req: VehicleAdditionRequestDto): void {
    this.confirmDialogTitle = this.translate.instant('vehicleRequests.confirm.declineTitle');
    this.confirmDialogMessage = this.translate.instant('vehicleRequests.confirm.declineMessage', {
      brand: req.brandName,
      model: req.modelName,
      user: req.userFullName
    });
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

  private doAccept(id: number, body?: AcceptVehicleRequestBody): void {
    this.processingId = id;
    this.cdr.markForCheck();

    this.requestsService.accept(id, body ?? null).subscribe({
      next: (res) => {
        if (res?.status) {
          this.toaster.success(res.message || this.translate.instant('vehicleRequests.messages.acceptSuccess'));
          this.closeDetails();
          this.onAcceptModalCancel();
          this.loadData();
          this.notificationService.loadVehicleRequestNotifications();
          this.refreshService.emit('vehicle-request');
          this.refreshService.emit('brand');
          this.refreshService.emit('model');
        } else {
          this.toaster.error(res?.message || this.translate.instant('vehicleRequests.messages.acceptFail'));
        }
        this.processingId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || this.translate.instant('vehicleRequests.messages.acceptFail'));
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
          this.toaster.success(res.message || this.translate.instant('vehicleRequests.messages.declineSuccess'));
          this.closeDetails();
          this.loadData();
          this.notificationService.loadVehicleRequestNotifications();
          this.refreshService.emit('vehicle-request');
        } else {
          this.toaster.error(res?.message || this.translate.instant('vehicleRequests.messages.declineFail'));
        }
        this.processingId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err?.error?.message || this.translate.instant('vehicleRequests.messages.declineFail'));
        this.processingId = null;
        this.cdr.markForCheck();
      }
    });
  }

  getStatusClass(status: VehicleAdditionRequestStatus): string {
    return `status-${status}`;
  }

  getStatusLabelKey(status: VehicleAdditionRequestStatus): string {
    return `vehicleRequests.status.${status}`;
  }

  trackById(_: number, item: VehicleAdditionRequestDto): number {
    return item.id;
  }
}
