import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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

// Status options for reports — labels are translation keys
const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'reports.statusOptions.all' },
  { value: 'true', label: 'reports.statusOptions.resolved' },
  { value: 'false', label: 'reports.statusOptions.pending' }
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent
  , TranslatePipe],
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
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

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
        this.toaster.error(err.message || this.t('reports.msg.loadFail'));
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

    if (diffMinutes < 1) return this.t('reports.timeAgo.now');
    if (diffMinutes < 60) return this.t('reports.timeAgo.minutesAgo', { count: diffMinutes });
    if (diffHours < 24) return this.t('reports.timeAgo.hoursAgo', { count: diffHours });
    if (diffDays === 1) return this.t('reports.timeAgo.yesterday');
    if (diffDays < 7) return this.t('reports.timeAgo.daysAgo', { count: diffDays });
    if (diffWeeks < 4) return this.t('reports.timeAgo.weeksAgo', { count: diffWeeks });
    if (diffMonths < 12) return this.t('reports.timeAgo.monthsAgo', { count: diffMonths });

    const diffYears = Math.floor(diffMonths / 12);
    return this.t('reports.timeAgo.yearsAgo', { count: diffYears });
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
            this.toaster.error(this.t('reports.msg.processNotFound'));
          }
        }
        this.isLoadingProcess = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(this.t('reports.msg.processLoadFail'));
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
          this.toaster.success(this.t(newStatus ? 'reports.msg.toggleResolved' : 'reports.msg.togglePending'));
        } else {
          this.toaster.error(response.message || this.t('reports.msg.toggleFail'));
        }
        this.updatingReportIds.delete(report.id);
        this.isUpdatingStatus = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(this.t('reports.msg.toggleErrorGeneric'));
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
    const key = `reports.processStatus.${status}`;
    const translated = this.t(key);
    return translated === key ? status : translated;
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: this.t('reports.printTitle'),
      filename: 'reports_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: this.t('reports.printColumns.id'), field: 'id' },
        { header: this.t('reports.printColumns.userName'), field: 'userFullName' },
        { header: this.t('reports.printColumns.email'), field: 'userEmail' },
        { header: this.t('reports.printColumns.phone'), field: 'userPhone' },
        { header: this.t('reports.printColumns.content'), field: 'reportContentShort' },
        { header: this.t('reports.printColumns.status'), field: 'statusText' },
        { header: this.t('reports.printColumns.date'), field: 'reportDateFormatted' }
      ],
      data: this.filteredReports.map((report, index) => ({
        ...report,
        index: index + 1,
        reportContentShort: report.reportContent?.substring(0, 50) + (report.reportContent?.length > 50 ? '...' : ''),
        statusText: this.t(report.isResolved ? 'reports.printColumns.resolved' : 'reports.printColumns.pending'),
        reportDateFormatted: this.formatDate(report.reportDate)
      }))
    });
  }
}
