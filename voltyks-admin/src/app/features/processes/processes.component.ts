import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminProcessesService } from '../../core/services/admin/admin-processes.service';
import { AdminProcessDto, ProcessFilterParams, PROCESS_STATUS_OPTIONS } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent
  ],
  templateUrl: './processes.component.html',
  styleUrls: ['./processes.component.scss']
})
export class ProcessesComponent implements OnInit {
  // Processes data
  processes: AdminProcessDto[] = [];
  filteredProcesses: AdminProcessDto[] = [];
  paginatedProcesses: AdminProcessDto[] = [];

  // Status options
  statusOptions = PROCESS_STATUS_OPTIONS;

  // Filters
  filters: ProcessFilterParams = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: '',
    search: ''
  };

  // Search
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;

  // Side Panel
  showSidePanel: boolean = false;
  selectedProcess: AdminProcessDto | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  // Today's date for max date validation
  today: string = new Date().toISOString().split('T')[0];

  constructor(
    private processesService: AdminProcessesService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadProcesses();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  loadProcesses(): void {
    this.isLoading = true;

    this.processesService.getProcesses().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.processes = response.data;
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل عمليات الشحن');
        this.isLoading = false;
      }
    });
  }

  onSearchChange(searchTerm: string): void {
    this.filters.search = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  onDateChange(): void {
    this.applyFilters();
  }

  clearDateFilters(): void {
    this.filters.startDate = this.today;
    this.filters.endDate = this.today;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = {
      startDate: this.today,
      endDate: this.today,
      status: '',
      search: ''
    };
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.processes];

    // Filter by search term
    if (this.filters.search?.trim()) {
      const term = this.filters.search.toLowerCase();
      result = result.filter(process =>
        process.id?.toString().includes(term) ||
        process.vehicleOwnerName?.toLowerCase().includes(term) ||
        process.vehicleOwnerEmail?.toLowerCase().includes(term) ||
        process.vehicleOwnerPhone?.includes(term) ||
        process.chargerOwnerName?.toLowerCase().includes(term) ||
        process.chargerOwnerEmail?.toLowerCase().includes(term) ||
        process.chargerOwnerPhone?.includes(term) ||
        process.vehiclePlate?.toLowerCase().includes(term) ||
        process.vehicleBrand?.toLowerCase().includes(term) ||
        process.vehicleModel?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.filters.status) {
      result = result.filter(process => process.status === this.filters.status);
    }

    // Filter by date range
    if (this.filters.startDate) {
      const startDate = new Date(this.filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      result = result.filter(process => {
        const processDate = new Date(process.requestedAt);
        return processDate >= startDate;
      });
    }

    if (this.filters.endDate) {
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(process => {
        const processDate = new Date(process.requestedAt);
        return processDate <= endDate;
      });
    }

    this.filteredProcesses = result;
    this.totalItems = this.filteredProcesses.length;
    this.currentPage = 1;
    this.updatePaginatedProcesses();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedProcesses();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedProcesses();
  }

  private updatePaginatedProcesses(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProcesses = this.filteredProcesses.slice(startIndex, endIndex);
  }

  // Side Panel Methods
  openSidePanel(process: AdminProcessDto): void {
    this.selectedProcess = process;
    this.showSidePanel = true;
    // Prevent body scroll when panel is open
    document.body.style.overflow = 'hidden';
  }

  closeSidePanel(): void {
    this.showSidePanel = false;
    this.selectedProcess = null;
    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Utility Methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'Pending':
        return 'status-pending';
      case 'Accepted':
        return 'status-accepted';
      case 'InProgress':
        return 'status-in-progress';
      case 'Aborted':
        return 'status-aborted';
      case 'Rejected':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  }

  getStatusText(status: string): string {
    const option = this.statusOptions.find(o => o.value === status);
    return option ? option.label : status;
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

  formatDateShort(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(value: number): string {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)} ج.م`;
  }

  formatDistance(km: number): string {
    if (km === null || km === undefined) return '-';
    return `${km.toFixed(1)} كم`;
  }

  formatTime(minutes: number): string {
    if (minutes === null || minutes === undefined) return '-';
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${hours} ساعة`;
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.startDate || this.filters.endDate);
  }
}
