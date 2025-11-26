import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminUsersService } from '../../../core/services/admin/admin-users.service';
import { AdminUserDto } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  paginatedUsers: AdminUserDto[] = [];

  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  isLoading: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  constructor(
    private usersService: AdminUsersService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadUsers();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  loadUsers(search?: string): void {
    this.isLoading = true;

    this.usersService.getUsers(search).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.users = response.data;
          this.filteredUsers = [...this.users];
          this.totalItems = this.filteredUsers.length;
          this.currentPage = 1;
          this.updatePaginatedUsers();
          this.toaster.success('تم تحميل المستخدمين بنجاح');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل المستخدمين');
        this.isLoading = false;
      }
    });
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  private performSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredUsers = [...this.users];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phoneNumber?.includes(term)
      );
    }

    this.totalItems = this.filteredUsers.length;
    this.currentPage = 1;
    this.updatePaginatedUsers();
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
    return user.isBanned ? 'status-banned' : 'status-active';
  }

  getStatusText(user: AdminUserDto): string {
    return user.isBanned ? 'محظور' : 'نشط';
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
}
