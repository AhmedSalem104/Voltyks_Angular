import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, takeUntil } from 'rxjs';
import { AdminReportsService } from '../../core/services/admin/admin-reports.service';
import { AdminProcessesService } from '../../core/services/admin/admin-processes.service';
import { AdminReportDto, AdminReportDetailsDto, ReportFilterParams, AdminProcessDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

// Extended report type with user details for table display
interface ReportWithUserDetails extends AdminReportDto {
  userEmail?: string;
  userPhone?: string;
}

// Status options for reports
const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'true', label: 'تم الحل' },
  { value: 'false', label: 'معلق' }
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent implements OnInit, OnDestroy {
  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  // Reports data
  reports: ReportWithUserDetails[] = [];
  filteredReports: ReportWithUserDetails[] = [];
  paginatedReports: ReportWithUserDetails[] = [];

  // Track updating status for each report
  updatingReportIds: Set<number> = new Set();

  // Status options
  statusOptions = REPORT_STATUS_OPTIONS;

  // Filters
  filters: ReportFilterParams & { search?: string; status?: string } = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    search: '',
    status: ''
  };

  // Search
  private searchSubject = new Subject<string>();

  // Loading
  isLoading = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalReports = 0;

  // Today's date for max date validation
  today: string = new Date().toISOString().split('T')[0];

  // Side Panel
  showSidePanel = false;
  selectedReport: AdminReportDto | null = null;
  selectedReportDetails: AdminReportDetailsDto | null = null;
  selectedProcess: AdminProcessDto | null = null;
  isLoadingProcess = false;
  isLoadingReportDetails = false;
  isUpdatingStatus = false;

  constructor(
    private reportsService: AdminReportsService,
    private processesService: AdminProcessesService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadReports();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReports(): void {
    this.isLoading = true;

    // Pass only date filters to API
    const apiFilters: ReportFilterParams = {};
    if (this.filters.startDate) apiFilters.startDate = this.filters.startDate;
    if (this.filters.endDate) apiFilters.endDate = this.filters.endDate;

    this.reportsService.getReports(apiFilters).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.reports = res.data;
          this.applyFilters();
          // Load user details for all reports
          this.loadUserDetailsForReports();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.message || 'فشل تحميل التقارير');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadUserDetailsForReports(): void {
    // Fetch details for each report to get email/phone
    const detailRequests = this.reports.map(report =>
      this.reportsService.getReportById(report.id)
    );

    if (detailRequests.length === 0) return;

    forkJoin(detailRequests).subscribe({
      next: (responses) => {
        responses.forEach((response, index) => {
          if (response.status && response.data) {
            this.reports[index].userEmail = response.data.userEmail;
            this.reports[index].userPhone = response.data.userPhone;
          }
        });
        // Update paginated reports to reflect changes
        this.updatePaginatedReports();
        this.cdr.markForCheck();
      },
      error: () => {
        // Silently fail - user details are optional
        this.cdr.markForCheck();
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
    this.loadReports();
  }

  clearDateFilters(): void {
    this.filters.startDate = this.today;
    this.filters.endDate = this.today;
    this.loadReports();
  }

  clearFilters(): void {
    this.filters = {
      startDate: this.today,
      endDate: this.today,
      search: '',
      status: ''
    };
    this.loadReports();
  }

  private applyFilters(): void {
    let result = [...this.reports];

    // Filter by search term
    if (this.filters.search?.trim()) {
      const term = this.filters.search.toLowerCase();
      result = result.filter(report =>
        report.userFullName?.toLowerCase().includes(term) ||
        report.reportContent?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.filters.status) {
      const isResolved = this.filters.status === 'true';
      result = result.filter(report => report.isResolved === isResolved);
    }

    this.filteredReports = result;
    this.totalReports = this.filteredReports.length;
    this.currentPage = 1;
    this.updatePaginatedReports();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedReports();
  }

  private updatePaginatedReports(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedReports = this.filteredReports.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  // Utility Methods
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateLong(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRelativeTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffMs / 604800000);
    const diffMonths = Math.floor(diffMs / 2592000000);

    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffWeeks < 4) return `منذ ${diffWeeks} أسبوع`;
    if (diffMonths < 12) return `منذ ${diffMonths} شهر`;

    const diffYears = Math.floor(diffMonths / 12);
    return `منذ ${diffYears} سنة`;
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.startDate || this.filters.endDate);
  }

  // Side Panel Methods
  openSidePanel(report: AdminReportDto): void {
    this.selectedReport = report;
    this.selectedReportDetails = null;
    this.selectedProcess = null;
    this.showSidePanel = true;
    document.body.style.overflow = 'hidden';

    // Load report details (with user email & phone)
    this.loadReportDetails(report.id);

    // Load process details
    if (report.processId) {
      this.loadProcessDetails(report.processId);
    }
  }

  closeSidePanel(): void {
    this.showSidePanel = false;
    this.selectedReport = null;
    this.selectedReportDetails = null;
    this.selectedProcess = null;
    document.body.style.overflow = '';
  }

  private loadReportDetails(reportId: number): void {
    this.isLoadingReportDetails = true;
    this.reportsService.getReportById(reportId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.selectedReportDetails = response.data;
        }
        this.isLoadingReportDetails = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoadingReportDetails = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadProcessDetails(processId: number): void {
    this.isLoadingProcess = true;
    // Use getProcesses and filter by processId since there's no single process endpoint
    this.processesService.getProcesses().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const process = response.data.find(p => p.id === processId);
          if (process) {
            this.selectedProcess = process;
          } else {
            this.toaster.error('لم يتم العثور على بيانات العملية');
          }
        }
        this.isLoadingProcess = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error('فشل تحميل بيانات العملية');
        this.isLoadingProcess = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleReportStatus(report: ReportWithUserDetails, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    // Check if already updating this report
    if (this.updatingReportIds.has(report.id)) {
      return;
    }

    this.updatingReportIds.add(report.id);
    this.isUpdatingStatus = true;
    this.cdr.markForCheck();
    const newStatus = !report.isResolved;

    this.reportsService.updateReportStatus(report.id, newStatus).subscribe({
      next: (response) => {
        if (response.status) {
          report.isResolved = newStatus;
          // Update in original reports array
          const originalReport = this.reports.find(r => r.id === report.id);
          if (originalReport) {
            originalReport.isResolved = newStatus;
          }
          if (this.selectedReport?.id === report.id) {
            this.selectedReport.isResolved = newStatus;
          }
          this.toaster.success(newStatus ? 'تم تحديث الحالة إلى: تم الحل' : 'تم تحديث الحالة إلى: معلق');
        } else {
          this.toaster.error(response.message || 'فشل تحديث الحالة');
        }
        this.updatingReportIds.delete(report.id);
        this.isUpdatingStatus = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error('فشل تحديث حالة البلاغ');
        this.updatingReportIds.delete(report.id);
        this.isUpdatingStatus = false;
        this.cdr.markForCheck();
      }
    });
  }

  isReportUpdating(reportId: number): boolean {
    return this.updatingReportIds.has(reportId);
  }

  // Process Status Methods
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Pending': 'status-pending',
      'Accepted': 'status-accepted',
      'InProgress': 'status-in-progress',
      'Completed': 'status-completed',
      'Aborted': 'status-aborted',
      'Rejected': 'status-rejected'
    };
    return statusClasses[status] || 'status-pending';
  }

  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'Pending': 'قيد الانتظار',
      'Accepted': 'مقبول',
      'InProgress': 'جاري التنفيذ',
      'Completed': 'مكتمل',
      'Aborted': 'ملغي',
      'Rejected': 'مرفوض'
    };
    return statusTexts[status] || status;
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير البلاغات',
      filename: 'reports_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'رقم البلاغ', field: 'id' },
        { header: 'اسم المستخدم', field: 'userFullName' },
        { header: 'البريد الإلكتروني', field: 'userEmail' },
        { header: 'رقم الهاتف', field: 'userPhone' },
        { header: 'محتوى البلاغ', field: 'reportContentShort' },
        { header: 'الحالة', field: 'statusText' },
        { header: 'التاريخ', field: 'reportDateFormatted' }
      ],
      data: this.filteredReports.map((report, index) => ({
        ...report,
        index: index + 1,
        reportContentShort: report.reportContent?.substring(0, 50) + (report.reportContent?.length > 50 ? '...' : ''),
        statusText: report.isResolved ? 'تم الحل' : 'معلق',
        reportDateFormatted: this.formatDate(report.reportDate)
      }))
    });
  }
}
