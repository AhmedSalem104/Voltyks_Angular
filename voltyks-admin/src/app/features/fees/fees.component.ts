import { Component, OnInit, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AdminFeesService } from '../../core/services/admin/admin-fees.service';
import { AdminUsersService } from '../../core/services/admin/admin-users.service';
import { AdminFeesDto, UpdateFeesDto, TransferFeesRequestDto, AdminUserDto } from '../../core/models';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingOverlayComponent, ConfirmDialogComponent, TranslatePipe],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.scss'],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeesComponent implements OnInit {
  fees?: AdminFeesDto;
  updateDto: UpdateFeesDto = { percentage: 0, minimumFee: 0 };
  transferDto: TransferFeesRequestDto = { recipientUserId: '', amount: 0, notes: null };
  isLoading = false;
  showUpdateDialog = false;
  showTransferDialog = false;
  loadError = false;

  // Users dropdown
  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  selectedUser: AdminUserDto | null = null;
  isDropdownOpen = false;
  searchQuery = '';

  constructor(
    private feesService: AdminFeesService,
    private usersService: AdminUsersService,
    private toaster: ToasterService,
    private printService: PrintService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.loadFees();
    this.loadUsers();
  }

  loadFees(): void {
    this.isLoading = true;
    this.loadError = false;
    this.feesService.getFees().subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.fees = res.data;
          this.updateDto = {
            percentage: res.data.percentage,
            minimumFee: res.data.minimumFee
          };
        } else {
          this.loadError = true;
          this.toaster.error(res.message || this.t('fees.msg.loadFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = true;
        this.toaster.error(err.error?.message || err.message || this.t('fees.msg.loadFailServer'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadUsers(): void {
    this.usersService.getUsers().subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.users = res.data;
          this.filteredUsers = res.data;
        } else {
          this.toaster.error(this.t('fees.msg.loadUsersFail'));
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error(this.t('fees.msg.loadUsersFail'));
        this.cdr.markForCheck();
      }
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.searchQuery = '';
      this.filteredUsers = this.users;
    }
  }

  filterUsers(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user =>
        user.fullName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phoneNumber?.includes(query)
      );
    }
  }

  selectUser(user: AdminUserDto): void {
    this.selectedUser = user;
    this.transferDto.recipientUserId = user.id;
    this.isDropdownOpen = false;
    this.searchQuery = '';
  }

  clearSelection(): void {
    this.selectedUser = null;
    this.transferDto.recipientUserId = '';
    this.searchQuery = '';
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.custom-dropdown');
    if (!dropdown && this.isDropdownOpen) {
      this.isDropdownOpen = false;
    }
  }

  openUpdateDialog(): void {
    // Validate input
    if (this.updateDto.percentage < 0 || this.updateDto.percentage > 100) {
      this.toaster.error(this.t('fees.msg.invalidPercentage'));
      return;
    }
    if (this.updateDto.minimumFee < 0) {
      this.toaster.error(this.t('fees.msg.invalidMinimum'));
      return;
    }
    this.showUpdateDialog = true;
  }

  openTransferDialog(): void {
    if (!this.transferDto.recipientUserId || this.transferDto.amount <= 0) {
      this.toaster.error(this.t('fees.msg.enterRecipient'));
      return;
    }
    this.showTransferDialog = true;
  }

  confirmUpdate(): void {
    this.showUpdateDialog = false;
    this.isLoading = true;

    this.feesService.updateFees(this.updateDto).subscribe({
      next: (res) => {
        if (res.status) {
          this.toaster.success(this.t('fees.msg.updateSuccess'));
          this.loadFees();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.message || this.t('fees.msg.updateFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  confirmTransfer(): void {
    this.showTransferDialog = false;
    this.isLoading = true;

    this.feesService.transferFees(this.transferDto).subscribe({
      next: (res) => {
        if (res.status) {
          this.toaster.success(this.t('fees.msg.transferSuccess'));
          this.transferDto = { recipientUserId: '', amount: 0, notes: null };
          this.selectedUser = null;
          this.loadFees();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.message || this.t('fees.msg.transferFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  printToPdf(): void {
    if (!this.fees) return;

    const currency = this.t('common.currency');
    const updatedBy = this.fees.updatedBy || this.t('fees.systemUser');
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #02e600; margin-bottom: 20px;">${this.t('fees.printHeading')}</h2>
      </div>

      <div style="display: grid; gap: 20px;">
        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">${this.t('fees.printPercent')}</div>
          <div style="color: #02e600; font-size: 32px; font-weight: 700;">${this.fees.percentage}%</div>
        </div>

        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">${this.t('fees.printMin')}</div>
          <div style="color: #02e600; font-size: 32px; font-weight: 700;">${this.fees.minimumFee} ${currency}</div>
        </div>

        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">${this.t('fees.printLastUpdate')}</div>
          <div style="color: #e0e0e0; font-size: 18px;">${this.formatDate(this.fees.updatedAt)}</div>
        </div>

        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">${this.t('fees.printUpdatedBy')}</div>
          <div style="color: #e0e0e0; font-size: 18px;">${updatedBy}</div>
        </div>
      </div>
    `;

    this.printService.printContentToPdf(content, {
      title: this.t('fees.printTitle'),
      filename: 'fees_report',
      orientation: 'portrait'
    });
  }
}
