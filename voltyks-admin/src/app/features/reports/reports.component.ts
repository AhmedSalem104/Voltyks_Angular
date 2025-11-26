import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminReportsService } from '../../core/services/admin/admin-reports.service';
import { AdminReportDto, ReportFilterParams } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

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
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  // Reports data
  reports: AdminReportDto[] = [];
  filteredReports: AdminReportDto[] = [];
  paginatedReports: AdminReportDto[] = [];

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

  constructor(
    private reportsService: AdminReportsService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadReports();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
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
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.toaster.error(err.message || 'فشل تحميل التقارير');
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
}
