import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminUsersService } from '../../../core/services/admin/admin-users.service';
import {
  AdminUserDetailsDto,
  AdminWalletDto,
  AdminUserVehicleDto,
  AdminUserReportDto,
  AddBalanceRequestDto
} from '../../../core/models';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingOverlayComponent,
    ConfirmDialogComponent,
    PaginationComponent
  ],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {
  userId!: string;
  user?: AdminUserDetailsDto;
  wallet?: AdminWalletDto;
  vehicles: AdminUserVehicleDto[] = [];
  reports: AdminUserReportDto[] = [];

  activeTab: 'overview' | 'wallet' | 'vehicles' | 'reports' | 'addBalance' = 'overview';

  isLoading: boolean = false;
  showBanDialog: boolean = false;

  // Add Balance
  addBalanceDto: AddBalanceRequestDto = { amount: 0, notes: null };
  showAddBalanceDialog: boolean = false;

  // Pagination for vehicles
  vehiclesPage: number = 1;
  vehiclesPageSize: number = 5;
  paginatedVehicles: AdminUserVehicleDto[] = [];

  // Pagination for reports
  reportsPage: number = 1;
  reportsPageSize: number = 5;
  paginatedReports: AdminUserReportDto[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: AdminUsersService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id')!;
    this.loadUserDetails();
  }

  loadUserDetails(): void {
    this.isLoading = true;

    this.usersService.getUserById(this.userId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.user = response.data;
          this.toaster.success('تم تحميل بيانات المستخدم');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل بيانات المستخدم');
        this.isLoading = false;
      }
    });
  }

  switchTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;

    // Load data for the selected tab
    switch (tab) {
      case 'wallet':
        if (!this.wallet) this.loadWallet();
        break;
      case 'vehicles':
        if (this.vehicles.length === 0) this.loadVehicles();
        break;
      case 'reports':
        if (this.reports.length === 0) this.loadReports();
        break;
    }
  }

  loadWallet(): void {
    this.isLoading = true;

    this.usersService.getUserWallet(this.userId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.wallet = response.data;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل المحفظة');
        this.isLoading = false;
      }
    });
  }

  loadVehicles(): void {
    this.isLoading = true;

    this.usersService.getUserVehicles(this.userId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.vehicles = response.data;
          this.updatePaginatedVehicles();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل المركبات');
        this.isLoading = false;
      }
    });
  }

  loadReports(): void {
    this.isLoading = true;

    this.usersService.getUserReports(this.userId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.reports = response.data;
          this.updatePaginatedReports();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل التقارير');
        this.isLoading = false;
      }
    });
  }

  openBanDialog(): void {
    this.showBanDialog = true;
  }

  confirmBanToggle(): void {
    this.isLoading = true;

    this.usersService.toggleBan(this.userId).subscribe({
      next: (response) => {
        if (response.status) {
          const action = this.user?.isBanned ? 'إلغاء الحظر' : 'الحظر';
          this.toaster.success(`تم ${action} بنجاح`);
          this.loadUserDetails();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشلت العملية');
        this.isLoading = false;
      }
    });
  }

  updatePaginatedVehicles(): void {
    const start = (this.vehiclesPage - 1) * this.vehiclesPageSize;
    const end = start + this.vehiclesPageSize;
    this.paginatedVehicles = this.vehicles.slice(start, end);
  }

  updatePaginatedReports(): void {
    const start = (this.reportsPage - 1) * this.reportsPageSize;
    const end = start + this.reportsPageSize;
    this.paginatedReports = this.reports.slice(start, end);
  }

  onVehiclesPageChange(page: number): void {
    this.vehiclesPage = page;
    this.updatePaginatedVehicles();
  }

  onReportsPageChange(page: number): void {
    this.reportsPage = page;
    this.updatePaginatedReports();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  // Add Balance Methods
  openAddBalanceDialog(): void {
    if (this.addBalanceDto.amount <= 0) {
      this.toaster.error('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }
    this.showAddBalanceDialog = true;
  }

  closeAddBalanceDialog(): void {
    this.showAddBalanceDialog = false;
  }

  confirmAddBalance(): void {
    this.isLoading = true;
    this.showAddBalanceDialog = false;

    this.usersService.addBalance(this.userId, this.addBalanceDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة الرصيد بنجاح');
          this.resetAddBalanceForm();
          // Reload wallet and user data
          this.loadUserDetails();
          if (this.wallet) {
            this.loadWallet();
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة الرصيد');
        this.isLoading = false;
      }
    });
  }

  resetAddBalanceForm(): void {
    this.addBalanceDto = { amount: 0, notes: null };
  }
}
