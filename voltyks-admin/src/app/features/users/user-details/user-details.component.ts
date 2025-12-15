import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminUsersService } from '../../../core/services/admin/admin-users.service';
import { AdminFeesService } from '../../../core/services/admin/admin-fees.service';
import {
  AdminUserDetailsDto,
  AdminWalletDto,
  AdminUserVehicleDto,
  AdminUserReportDto,
  AddBalanceRequestDto,
  WalletTransactionDto
} from '../../../core/models';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { PrintService } from '../../../core/services/print.service';

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

  activeTab: 'overview' | 'wallet' | 'vehicles' | 'reports' | 'manageBalance' = 'overview';

  isLoading: boolean = false;
  showBanDialog: boolean = false;

  // Add Balance
  addBalanceDto: AddBalanceRequestDto = { amount: 0, notes: null };
  showAddBalanceDialog: boolean = false;

  // Deduct Balance
  deductBalanceDto: AddBalanceRequestDto = { amount: 0, notes: null };
  showDeductBalanceDialog: boolean = false;

  // Pagination for vehicles
  vehiclesPage: number = 1;
  vehiclesPageSize: number = 5;
  paginatedVehicles: AdminUserVehicleDto[] = [];

  // Pagination for reports
  reportsPage: number = 1;
  reportsPageSize: number = 5;
  paginatedReports: AdminUserReportDto[] = [];

  // Wallet Transactions
  walletTransactions: WalletTransactionDto[] = [];
  filteredTransactions: WalletTransactionDto[] = [];
  paginatedTransactions: WalletTransactionDto[] = [];
  transactionsPage: number = 1;
  transactionsPageSize: number = 10;

  // Date filter for transactions (default to today)
  transactionDateFrom: string = new Date().toISOString().split('T')[0];
  transactionDateTo: string = new Date().toISOString().split('T')[0];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: AdminUsersService,
    private feesService: AdminFeesService,
    private toaster: ToasterService,
    private printService: PrintService
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
      case 'manageBalance':
        if (this.walletTransactions.length === 0) this.loadWalletTransactions();
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

  // Wallet Transactions Methods
  loadWalletTransactions(): void {
    this.isLoading = true;

    this.feesService.getWalletTransactions(this.userId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.walletTransactions = response.data;
          this.transactionsPage = 1;
          // Apply date filter (defaults to today)
          this.filterTransactionsByDate();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل سجل المعاملات');
        this.isLoading = false;
      }
    });
  }

  updatePaginatedTransactions(): void {
    const start = (this.transactionsPage - 1) * this.transactionsPageSize;
    const end = start + this.transactionsPageSize;
    this.paginatedTransactions = this.filteredTransactions.slice(start, end);
  }

  onTransactionsPageChange(page: number): void {
    this.transactionsPage = page;
    this.updatePaginatedTransactions();
  }

  onTransactionsPageSizeChange(size: number): void {
    this.transactionsPageSize = size;
    this.transactionsPage = 1;
    this.updatePaginatedTransactions();
  }

  filterTransactionsByDate(): void {
    this.filteredTransactions = this.walletTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      transactionDate.setHours(0, 0, 0, 0);

      let matchesFrom = true;
      let matchesTo = true;

      if (this.transactionDateFrom) {
        const fromDate = new Date(this.transactionDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        matchesFrom = transactionDate >= fromDate;
      }

      if (this.transactionDateTo) {
        const toDate = new Date(this.transactionDateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesTo = transactionDate <= toDate;
      }

      return matchesFrom && matchesTo;
    });

    this.transactionsPage = 1;
    this.updatePaginatedTransactions();
  }

  clearTransactionsFilter(): void {
    // Reset to today's date
    const today = new Date().toISOString().split('T')[0];
    this.transactionDateFrom = today;
    this.transactionDateTo = today;
    this.transactionsPage = 1;
    this.filterTransactionsByDate();
  }

  showAllTransactions(): void {
    this.transactionDateFrom = '';
    this.transactionDateTo = '';
    this.filteredTransactions = [...this.walletTransactions];
    this.transactionsPage = 1;
    this.updatePaginatedTransactions();
  }

  printTransactionsToPdf(): void {
    const userName = this.user?.fullName || 'المستخدم';
    this.printService.printTableToPdf({
      title: `سجل معاملات - ${userName}`,
      filename: `transactions_${this.userId}`,
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'التاريخ', field: 'formattedDate' },
        { header: 'النوع', field: 'typeArabic' },
        { header: 'المبلغ', field: 'formattedAmount' },
        { header: 'الرصيد السابق', field: 'previousBalance' },
        { header: 'الرصيد الجديد', field: 'newBalance' },
        { header: 'الملاحظات', field: 'notes' }
      ],
      data: this.filteredTransactions.map((transaction, index) => ({
        ...transaction,
        index: index + 1,
        formattedDate: this.formatDate(transaction.createdAt),
        typeArabic: transaction.transactionType === 'Add' ? 'إضافة' : 'خصم',
        formattedAmount: `${transaction.transactionType === 'Add' ? '+' : ''}${transaction.amount} ج.م`,
        notes: transaction.notes || '-'
      }))
    });
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
    if (!this.addBalanceDto.amount || this.addBalanceDto.amount <= 0) {
      this.toaster.error('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!this.addBalanceDto.notes || this.addBalanceDto.notes.trim() === '') {
      this.toaster.error('يرجى إدخال الملاحظات');
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

    this.feesService.transferFees({
      recipientUserId: this.userId,
      amount: this.addBalanceDto.amount,
      notes: this.addBalanceDto.notes
    }).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة الرصيد بنجاح');
          this.resetAddBalanceForm();
          // Reload wallet, user data, and transactions
          this.loadUserDetails();
          this.loadWalletTransactions();
          if (this.wallet) {
            this.loadWallet();
          }
        } else {
          this.toaster.error(response.message || 'فشل إضافة الرصيد');
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

  // Deduct Balance Methods
  openDeductBalanceDialog(): void {
    if (!this.deductBalanceDto.amount || this.deductBalanceDto.amount <= 0) {
      this.toaster.error('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!this.deductBalanceDto.notes || this.deductBalanceDto.notes.trim() === '') {
      this.toaster.error('يرجى إدخال الملاحظات');
      return;
    }
    this.showDeductBalanceDialog = true;
  }

  closeDeductBalanceDialog(): void {
    this.showDeductBalanceDialog = false;
  }

  confirmDeductBalance(): void {
    this.isLoading = true;
    this.showDeductBalanceDialog = false;

    this.feesService.transferFees({
      recipientUserId: this.userId,
      amount: -this.deductBalanceDto.amount,  // سالب للخصم
      notes: this.deductBalanceDto.notes
    }).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم خصم الرصيد بنجاح');
          this.resetDeductBalanceForm();
          // Reload wallet, user data, and transactions
          this.loadUserDetails();
          this.loadWalletTransactions();
          if (this.wallet) {
            this.loadWallet();
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل خصم الرصيد');
        this.isLoading = false;
      }
    });
  }

  resetDeductBalanceForm(): void {
    this.deductBalanceDto = { amount: 0, notes: null };
  }
}
