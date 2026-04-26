import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminStoreService } from '../../../core/services/admin/admin-store.service';
import {
  AdminReservationDto,
  ReservationStatus,
  PaymentStatus,
  DeliveryStatus,
  RecordContactDto,
  RecordPaymentDto,
  RecordDeliveryDto,
  RESERVATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  PAYMENT_METHODS
} from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { PrintService } from '../../../core/services/print.service';

@Component({
  selector: 'app-store-reservations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  , TranslatePipe],
  templateUrl: './store-reservations.component.html',
  styleUrls: ['./store-reservations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreReservationsComponent implements OnInit, OnDestroy {
  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  // Data
  reservations: AdminReservationDto[] = [];
  paginatedReservations: AdminReservationDto[] = [];

  // Filters
  searchTerm: string = '';
  statusFilter: ReservationStatus | '' = '';
  paymentStatusFilter: PaymentStatus | '' = '';
  deliveryStatusFilter: DeliveryStatus | '' = '';
  fromDate: string = '';
  toDate: string = '';
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;
  isSaving: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;

  // Modals
  showDetailsDialog: boolean = false;
  showContactDialog: boolean = false;
  showPaymentDialog: boolean = false;
  showDeliveryDialog: boolean = false;
  showCancelConfirm: boolean = false;
  showCompleteConfirm: boolean = false;

  // Current item
  currentReservation: AdminReservationDto | null = null;

  // Form data
  contactDto: RecordContactDto = { notes: '' };
  paymentDto: RecordPaymentDto = { paymentMethod: 'cash', notes: '' };
  deliveryDto: RecordDeliveryDto = { notes: '' };

  // Status options — labels are translation keys, resolved via | translate in templates
  statusOptions: { value: ReservationStatus; label: string }[] = [
    { value: 'pending', label: 'store.reservationStatus.pending' },
    { value: 'contacted', label: 'store.reservationStatus.contacted' },
    { value: 'completed', label: 'store.reservationStatus.completed' },
    { value: 'cancelled', label: 'store.reservationStatus.cancelled' }
  ];

  paymentStatusOptions: { value: PaymentStatus; label: string }[] = [
    { value: 'unpaid', label: 'store.paymentStatus.unpaid' },
    { value: 'paid', label: 'store.paymentStatus.paid' }
  ];

  deliveryStatusOptions: { value: DeliveryStatus; label: string }[] = [
    { value: 'pending', label: 'store.deliveryStatus.pending' },
    { value: 'delivered', label: 'store.deliveryStatus.delivered' }
  ];

  paymentMethods = PAYMENT_METHODS;

  constructor(
    private storeService: AdminStoreService,
    private toaster: ToasterService,
    private printService: PrintService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadReservations();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadReservations();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReservations(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.storeService.getReservations({
      status: this.statusFilter || undefined,
      paymentStatus: this.paymentStatusFilter || undefined,
      deliveryStatus: this.deliveryStatusFilter || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      search: this.searchTerm.trim() || undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.reservations = response.data.items;
          this.totalItems = response.data.totalCount;
          this.totalPages = response.data.totalPages;
          this.paginatedReservations = this.reservations;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(this.getErrorMessage(error, this.translate.instant('store.reservations.msg.loadFail')));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadReservations();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadReservations();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadReservations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.paymentStatusFilter = '';
    this.deliveryStatusFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.currentPage = 1;
    this.loadReservations();
  }

  // Details Dialog
  openDetailsDialog(reservation: AdminReservationDto): void {
    this.currentReservation = reservation;
    this.showDetailsDialog = true;
  }

  closeDetailsDialog(): void {
    this.showDetailsDialog = false;
    this.currentReservation = null;
  }

  // Contact Dialog
  openContactDialog(reservation: AdminReservationDto): void {
    this.currentReservation = reservation;
    this.contactDto = { notes: '' };
    this.showContactDialog = true;
  }

  closeContactDialog(): void {
    this.showContactDialog = false;
    this.currentReservation = null;
    this.contactDto = { notes: '' };
  }

  recordContact(): void {
    if (!this.currentReservation) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.recordContact(this.currentReservation.id, this.contactDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.translate.instant('store.reservations.msg.contactSuccess'));
          this.closeContactDialog();
          this.loadReservations();
        } else {
          this.toaster.error(this.extractMessage(response.message, this.translate.instant('store.reservations.msg.contactFail')));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(this.getErrorMessage(error, this.translate.instant('store.reservations.msg.contactFail')));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Payment Dialog
  openPaymentDialog(reservation: AdminReservationDto): void {
    this.currentReservation = reservation;
    this.paymentDto = { paymentMethod: 'cash', notes: '' };
    this.showPaymentDialog = true;
  }

  closePaymentDialog(): void {
    this.showPaymentDialog = false;
    this.currentReservation = null;
    this.paymentDto = { paymentMethod: 'cash', notes: '' };
  }

  recordPayment(): void {
    if (!this.currentReservation) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.recordPayment(this.currentReservation.id, this.paymentDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.translate.instant('store.reservations.msg.paymentSuccess'));
          this.closePaymentDialog();
          this.loadReservations();
        } else {
          this.toaster.error(this.extractMessage(response.message, this.translate.instant('store.reservations.msg.paymentFail')));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(this.getErrorMessage(error, this.translate.instant('store.reservations.msg.paymentFail')));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Delivery Dialog
  openDeliveryDialog(reservation: AdminReservationDto): void {
    this.currentReservation = reservation;
    this.deliveryDto = { notes: '' };
    this.showDeliveryDialog = true;
  }

  closeDeliveryDialog(): void {
    this.showDeliveryDialog = false;
    this.currentReservation = null;
    this.deliveryDto = { notes: '' };
  }

  recordDelivery(): void {
    if (!this.currentReservation) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.recordDelivery(this.currentReservation.id, this.deliveryDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.translate.instant('store.reservations.msg.deliverySuccess'));
          this.closeDeliveryDialog();
          this.loadReservations();
        } else {
          this.toaster.error(this.extractMessage(response.message, this.translate.instant('store.reservations.msg.deliveryFail')));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(this.getErrorMessage(error, this.translate.instant('store.reservations.msg.deliveryFail')));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Complete Confirm
  openCompleteConfirm(reservation: AdminReservationDto): void {
    this.currentReservation = reservation;
    this.showCompleteConfirm = true;
  }

  closeCompleteConfirm(): void {
    this.showCompleteConfirm = false;
    this.currentReservation = null;
  }

  confirmComplete(): void {
    if (!this.currentReservation) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.completeReservation(this.currentReservation.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.translate.instant('store.reservations.msg.completeSuccess'));
          this.closeCompleteConfirm();
          this.loadReservations();
        } else {
          this.toaster.error(this.extractMessage(response.message, this.translate.instant('store.reservations.msg.completeFail')));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(this.getErrorMessage(error, this.translate.instant('store.reservations.msg.completeFail')));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Cancel Confirm
  openCancelConfirm(reservation: AdminReservationDto): void {
    this.currentReservation = reservation;
    this.showCancelConfirm = true;
  }

  closeCancelConfirm(): void {
    this.showCancelConfirm = false;
    this.currentReservation = null;
  }

  confirmCancel(): void {
    if (!this.currentReservation) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.cancelReservation(this.currentReservation.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.translate.instant('store.reservations.msg.cancelSuccess'));
          this.closeCancelConfirm();
          this.loadReservations();
        } else {
          this.toaster.error(this.extractMessage(response.message, this.translate.instant('store.reservations.msg.cancelFail')));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(this.getErrorMessage(error, this.translate.instant('store.reservations.msg.cancelFail')));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Helpers — labels are translation keys; resolve at runtime via TranslateService
  getStatusLabel(status: ReservationStatus): string {
    const key = RESERVATION_STATUS_LABELS[status];
    return key ? this.translate.instant(key) : status;
  }

  getStatusClass(status: ReservationStatus): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'contacted': return 'status-contacted';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    const key = PAYMENT_STATUS_LABELS[status];
    return key ? this.translate.instant(key) : status;
  }

  getPaymentStatusClass(status: PaymentStatus): string {
    switch (status) {
      case 'paid': return 'payment-paid';
      case 'unpaid': return 'payment-unpaid';
      default: return '';
    }
  }

  getDeliveryStatusLabel(status: DeliveryStatus): string {
    const key = DELIVERY_STATUS_LABELS[status];
    return key ? this.translate.instant(key) : status;
  }

  getDeliveryStatusClass(status: DeliveryStatus): string {
    switch (status) {
      case 'delivered': return 'delivery-delivered';
      case 'pending': return 'delivery-pending';
      default: return '';
    }
  }

  getPaymentMethodLabel(method: string): string {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found ? this.translate.instant(found.label) : method;
  }

  formatPrice(price: number): string {
    return price.toLocaleString('en-US') + ' ' + this.translate.instant('common.currency');
  }

  getFullImageUrl(imagePath: string): string {
    return this.storeService.getImageUrl(imagePath);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatShortDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  canContact(reservation: AdminReservationDto): boolean {
    return reservation.status === 'pending';
  }

  canRecordPayment(reservation: AdminReservationDto): boolean {
    return reservation.status === 'contacted' && reservation.paymentStatus === 'unpaid';
  }

  canRecordDelivery(reservation: AdminReservationDto): boolean {
    return reservation.paymentStatus === 'paid' && reservation.deliveryStatus === 'pending';
  }

  canComplete(reservation: AdminReservationDto): boolean {
    return reservation.paymentStatus === 'paid' &&
           reservation.deliveryStatus === 'delivered' &&
           reservation.status !== 'completed' &&
           reservation.status !== 'cancelled';
  }

  canCancel(reservation: AdminReservationDto): boolean {
    return reservation.status !== 'completed' && reservation.status !== 'cancelled';
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: this.translate.instant('store.reservations.printTitle'),
      filename: 'store_reservations_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'id' },
        { header: this.translate.instant('store.reservations.printColumns.product'), field: 'productName' },
        { header: this.translate.instant('store.reservations.printColumns.customer'), field: 'userName' },
        { header: this.translate.instant('store.reservations.printColumns.phone'), field: 'userPhone' },
        { header: this.translate.instant('store.reservations.printColumns.status'), field: 'statusLabel' },
        { header: this.translate.instant('store.reservations.printColumns.payment'), field: 'paymentLabel' },
        { header: this.translate.instant('store.reservations.printColumns.delivery'), field: 'deliveryLabel' },
        { header: this.translate.instant('store.reservations.printColumns.price'), field: 'priceFormatted' },
        { header: this.translate.instant('store.reservations.printColumns.date'), field: 'dateFormatted' }
      ],
      data: this.reservations.map((res) => ({
        ...res,
        statusLabel: this.getStatusLabel(res.status),
        paymentLabel: this.getPaymentStatusLabel(res.paymentStatus),
        deliveryLabel: this.getDeliveryStatusLabel(res.deliveryStatus),
        priceFormatted: this.formatPrice(res.unitPrice),
        dateFormatted: this.formatShortDate(res.createdAt)
      }))
    });
  }

  /**
   * Extract error message from HttpErrorResponse
   */
  private getErrorMessage(error: any, fallback: string): string {
    if (typeof error === 'string') return error;

    // Handle HttpErrorResponse.error
    const errorBody = error?.error;
    if (errorBody) {
      if (typeof errorBody === 'string') return errorBody;
      if (errorBody.message && typeof errorBody.message === 'string') return errorBody.message;
      if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
        return errorBody.errors[0];
      }
      // Try to find any string value in the error body
      if (typeof errorBody === 'object') {
        for (const val of Object.values(errorBody)) {
          if (typeof val === 'string' && val.length > 0) return val;
        }
      }
    }

    if (error?.message && typeof error.message === 'string') return error.message;
    return fallback;
  }

  /**
   * Extract message from API response (handles object messages)
   */
  private extractMessage(message: any, fallback: string): string {
    if (!message) return fallback;
    if (typeof message === 'string') return message;
    if (message?.message && typeof message.message === 'string') return message.message;
    if (message?.error && typeof message.error === 'string') return message.error;
    if (Array.isArray(message?.errors) && message.errors.length > 0) {
      return message.errors[0];
    }
    if (Array.isArray(message) && message.length > 0 && typeof message[0] === 'string') {
      return message[0];
    }
    if (typeof message === 'object') {
      for (const val of Object.values(message)) {
        if (typeof val === 'string' && val.length > 0) return val;
      }
    }
    return fallback;
  }
}
