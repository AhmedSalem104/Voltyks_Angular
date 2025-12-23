import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminComplaintsService } from '../../core/services/admin/admin-complaints.service';
import { AdminComplaintCategoriesService } from '../../core/services/admin/admin-complaint-categories.service';
import { AdminUsersService } from '../../core/services/admin/admin-users.service';
import { AdminComplaintDto, AdminComplaintCategoryDto, AdminUserDto, CreateGeneralComplaintDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent
  ],
  templateUrl: './complaints-list.component.html',
  styleUrls: ['./complaints-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComplaintsListComponent implements OnInit {
  // Complaints data
  complaints: AdminComplaintDto[] = [];
  filteredComplaints: AdminComplaintDto[] = [];
  paginatedComplaints: AdminComplaintDto[] = [];
  categories: AdminComplaintCategoryDto[] = [];

  // Filters
  searchTerm = '';
  selectedCategoryId: number | null = null;
  showResolved = true;

  // Loading states
  isLoading = false;
  updatingComplaintId: number | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalComplaints = 0;

  // Modal states
  showDetailsModal = false;
  showAddComplaintModal = false;
  selectedComplaint: AdminComplaintDto | null = null;

  // Add complaint form
  users: AdminUserDto[] = [];
  complaintForm: CreateGeneralComplaintDto = {
    userId: '',
    categoryId: 0,
    content: ''
  };
  isSaving = false;
  userSearchTerm = '';
  filteredUsers: AdminUserDto[] = [];

  // Stats
  totalPending = 0;
  totalResolved = 0;

  constructor(
    private complaintsService: AdminComplaintsService,
    private categoriesService: AdminComplaintCategoriesService,
    private usersService: AdminUsersService,
    private toaster: ToasterService,
    private printService: PrintService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadComplaints();
    this.loadUsers();
  }

  loadCategories(): void {
    this.categoriesService.getCategories({ includeDeleted: false }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.categories = response.data;
        }
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  loadComplaints(): void {
    this.isLoading = true;

    this.complaintsService.getComplaints({
      includeResolved: this.showResolved
    }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.complaints = response.data;
          this.calculateStats();
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.toaster.error(err.message || 'فشل تحميل الشكاوى');
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.totalPending = this.complaints.filter(c => !c.isResolved).length;
    this.totalResolved = this.complaints.filter(c => c.isResolved).length;
  }

  applyFilters(): void {
    let result = [...this.complaints];

    // Filter by category
    if (this.selectedCategoryId) {
      result = result.filter(c => c.categoryId === this.selectedCategoryId);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(complaint =>
        complaint.content.toLowerCase().includes(term) ||
        complaint.userName?.toLowerCase().includes(term) ||
        complaint.userEmail?.toLowerCase().includes(term) ||
        complaint.categoryName.toLowerCase().includes(term)
      );
    }

    this.filteredComplaints = result;
    this.totalComplaints = this.filteredComplaints.length;
    this.currentPage = 1;
    this.updatePaginatedComplaints();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onShowResolvedChange(): void {
    this.loadComplaints();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedComplaints();
  }

  private updatePaginatedComplaints(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedComplaints = this.filteredComplaints.slice(startIndex, endIndex);
  }

  // Details Modal
  openDetailsModal(complaint: AdminComplaintDto): void {
    this.selectedComplaint = complaint;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedComplaint = null;
  }

  // Toggle Status
  toggleStatus(complaint: AdminComplaintDto): void {
    this.updatingComplaintId = complaint.id;
    const newStatus = !complaint.isResolved;

    this.complaintsService.updateComplaintStatus(complaint.id, newStatus).subscribe({
      next: (response) => {
        if (response.status) {
          complaint.isResolved = newStatus;
          this.calculateStats();
          this.toaster.success(newStatus ? 'تم تحديد الشكوى كمحلولة' : 'تم إلغاء حل الشكوى');
        } else {
          this.toaster.error(response.message || 'فشل تحديث حالة الشكوى');
        }
        this.updatingComplaintId = null;
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'فشل تحديث حالة الشكوى');
        this.updatingComplaintId = null;
      }
    });
  }

  // Load Users
  loadUsers(): void {
    this.usersService.getUsers().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.users = response.data;
          this.filteredUsers = this.users;
        }
      },
      error: (err) => {
        console.error('Failed to load users', err);
      }
    });
  }

  // Add Complaint Modal
  openAddComplaintModal(): void {
    this.complaintForm = {
      userId: '',
      categoryId: 0,
      content: ''
    };
    this.userSearchTerm = '';
    this.filteredUsers = this.users;
    this.showAddComplaintModal = true;
  }

  closeAddComplaintModal(): void {
    this.showAddComplaintModal = false;
    this.complaintForm = {
      userId: '',
      categoryId: 0,
      content: ''
    };
  }

  onUserSearch(): void {
    if (!this.userSearchTerm.trim()) {
      this.filteredUsers = this.users;
      return;
    }
    const term = this.userSearchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.fullName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phoneNumber?.toLowerCase().includes(term)
    );
  }

  submitComplaint(): void {
    if (!this.complaintForm.userId) {
      this.toaster.error('يرجى اختيار المستخدم');
      return;
    }
    if (!this.complaintForm.categoryId) {
      this.toaster.error('يرجى اختيار نوع الشكوى');
      return;
    }
    if (!this.complaintForm.content.trim()) {
      this.toaster.error('محتوى الشكوى مطلوب');
      return;
    }

    this.isSaving = true;
    this.complaintsService.createComplaint(this.complaintForm).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إرسال الشكوى بنجاح');
          this.closeAddComplaintModal();
          this.loadComplaints();
        } else {
          this.toaster.error(response.message || 'فشل إرسال الشكوى');
        }
        this.isSaving = false;
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'فشل إرسال الشكوى');
        this.isSaving = false;
      }
    });
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

  truncateContent(content: string, maxLength: number = 100): string {
    if (!content) return '-';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير الشكاوى',
      filename: 'complaints_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'رقم الشكوى', field: 'id' },
        { header: 'اسم المستخدم', field: 'userName' },
        { header: 'البريد الإلكتروني', field: 'userEmail' },
        { header: 'نوع الشكوى', field: 'categoryName' },
        { header: 'المحتوى', field: 'contentShort' },
        { header: 'الحالة', field: 'statusText' },
        { header: 'التاريخ', field: 'createdAtFormatted' }
      ],
      data: this.filteredComplaints.map((complaint, index) => ({
        ...complaint,
        index: index + 1,
        contentShort: complaint.content?.substring(0, 50) + (complaint.content?.length > 50 ? '...' : ''),
        statusText: complaint.isResolved ? 'تم الحل' : 'معلقة',
        createdAtFormatted: this.formatDate(complaint.createdAt)
      }))
    });
  }
}
