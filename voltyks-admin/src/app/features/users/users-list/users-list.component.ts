import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminUsersService } from '../../../core/services/admin/admin-users.service';
import { AdminUserDto } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { PrintService } from '../../../core/services/print.service';

type UserFilter = 'active' | 'deleted' | 'all';
type DeleteAction = 'soft' | 'permanent' | 'restore' | null;

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersListComponent implements OnInit, OnDestroy {
  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  paginatedUsers: AdminUserDto[] = [];

  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  isLoading: boolean = false;

  // Filter for deleted users
  userFilter: UserFilter = 'active';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  // Confirm dialog state
  showConfirmDialog: boolean = false;
  confirmDialogTitle: string = '';
  confirmDialogMessage: string = '';
  selectedUser: AdminUserDto | null = null;
  pendingAction: DeleteAction = null;

  constructor(
    private usersService: AdminUsersService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadUsers();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(search?: string): void {
    this.isLoading = true;

    const includeDeleted = this.userFilter === 'deleted' || this.userFilter === 'all';

    this.usersService.getUsers({ search, includeDeleted }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.users = response.data;
          this.applyLocalFilter();
          this.currentPage = 1;
          this.updatePaginatedUsers();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل المستخدمين');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private applyLocalFilter(): void {
    switch (this.userFilter) {
      case 'active':
        this.filteredUsers = this.users.filter(u => !u.isDeleted);
        break;
      case 'deleted':
        this.filteredUsers = this.users.filter(u => u.isDeleted);
        break;
      case 'all':
        this.filteredUsers = [...this.users];
        break;
    }
    this.totalItems = this.filteredUsers.length;
  }

  onFilterChange(filter: UserFilter): void {
    this.userFilter = filter;
    this.loadUsers(this.searchTerm.trim() || undefined);
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  private performSearch(searchTerm: string): void {
    // Call API with search parameter
    this.loadUsers(searchTerm.trim() || undefined);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedUsers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedUsers();
  }

  private updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  getStatusClass(user: AdminUserDto): string {
    if (user.isDeleted) return 'status-deleted';
    if (user.isBanned) return 'status-banned';
    return 'status-active';
  }

  getStatusText(user: AdminUserDto): string {
    if (user.isDeleted) return 'محذوف';
    if (user.isBanned) return 'محظور';
    return 'نشط';
  }

  // ========== Delete Actions ==========

  /**
   * Initiate soft delete
   */
  onDeleteUser(user: AdminUserDto): void {
    this.selectedUser = user;
    this.pendingAction = 'soft';
    this.confirmDialogTitle = 'حذف المستخدم';
    this.confirmDialogMessage = `هل أنت متأكد من حذف المستخدم "${user.fullName}"؟\n\nسيتم إخفاء المستخدم ولكن يمكن استعادته لاحقاً.`;
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  /**
   * Initiate permanent delete
   */
  onPermanentDeleteUser(user: AdminUserDto): void {
    this.selectedUser = user;
    this.pendingAction = 'permanent';
    this.confirmDialogTitle = '⚠️ حذف نهائي';
    this.confirmDialogMessage = `تحذير: هذا الإجراء لا يمكن التراجع عنه!\n\nهل أنت متأكد من الحذف النهائي للمستخدم "${user.fullName}"؟\n\nسيتم حذف جميع بيانات المستخدم بشكل دائم.`;
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  /**
   * Initiate restore
   */
  onRestoreUser(user: AdminUserDto): void {
    this.selectedUser = user;
    this.pendingAction = 'restore';
    this.confirmDialogTitle = 'استعادة المستخدم';
    this.confirmDialogMessage = `هل تريد استعادة المستخدم "${user.fullName}"؟`;
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  /**
   * Confirm dialog action
   */
  onConfirmAction(): void {
    if (!this.selectedUser || !this.pendingAction) return;

    this.showConfirmDialog = false;
    this.isLoading = true;
    this.cdr.markForCheck();

    switch (this.pendingAction) {
      case 'soft':
        this.executeSoftDelete();
        break;
      case 'permanent':
        this.executePermanentDelete();
        break;
      case 'restore':
        this.executeRestore();
        break;
    }
  }

  /**
   * Cancel dialog action
   */
  onCancelAction(): void {
    this.showConfirmDialog = false;
    this.selectedUser = null;
    this.pendingAction = null;
    this.cdr.markForCheck();
  }

  private executeSoftDelete(): void {
    if (!this.selectedUser) return;

    this.usersService.deleteUser(this.selectedUser.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(`تم حذف المستخدم "${this.selectedUser?.fullName}" بنجاح`);
          this.loadUsers(this.searchTerm.trim() || undefined);
        } else {
          this.toaster.error(response.message || 'فشل حذف المستخدم');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
        this.resetActionState();
      },
      error: (error) => {
        this.toaster.error(error.error?.message || 'فشل حذف المستخدم');
        this.isLoading = false;
        this.resetActionState();
        this.cdr.markForCheck();
      }
    });
  }

  private executePermanentDelete(): void {
    if (!this.selectedUser) return;

    this.usersService.permanentDeleteUser(this.selectedUser.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(`تم الحذف النهائي للمستخدم "${this.selectedUser?.fullName}"`);
          this.loadUsers(this.searchTerm.trim() || undefined);
        } else {
          this.toaster.error(response.message || 'فشل الحذف النهائي');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
        this.resetActionState();
      },
      error: (error) => {
        this.toaster.error(error.error?.message || 'فشل الحذف النهائي');
        this.isLoading = false;
        this.resetActionState();
        this.cdr.markForCheck();
      }
    });
  }

  private executeRestore(): void {
    if (!this.selectedUser) return;

    this.usersService.restoreUser(this.selectedUser.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(`تم استعادة المستخدم "${this.selectedUser?.fullName}" بنجاح`);
          this.loadUsers(this.searchTerm.trim() || undefined);
        } else {
          this.toaster.error(response.message || 'فشل استعادة المستخدم');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
        this.resetActionState();
      },
      error: (error) => {
        this.toaster.error(error.error?.message || 'فشل استعادة المستخدم');
        this.isLoading = false;
        this.resetActionState();
        this.cdr.markForCheck();
      }
    });
  }

  private resetActionState(): void {
    this.selectedUser = null;
    this.pendingAction = null;
  }

  formatDeletedDate(dateString: string | null | undefined): string {
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

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير المستخدمين',
      filename: 'users_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'الاسم الكامل', field: 'fullName' },
        { header: 'البريد الإلكتروني', field: 'email' },
        { header: 'رقم الهاتف', field: 'phoneNumber' },
        { header: 'تاريخ التسجيل', field: 'dateCreatedFormatted' },
        { header: 'الحالة', field: 'statusText' }
      ],
      data: this.filteredUsers.map((user, index) => ({
        ...user,
        index: index + 1,
        dateCreatedFormatted: this.formatDate(user.dateCreated),
        statusText: user.isBanned ? 'محظور' : 'نشط'
      }))
    });
  }
}
