import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, LoadingOverlayComponent, ConfirmDialogComponent],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.scss'],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class FeesComponent implements OnInit {
  fees?: AdminFeesDto;
  updateDto: UpdateFeesDto = { percentage: 0, minimumFee: 0 };
  transferDto: TransferFeesRequestDto = { recipientUserId: '', amount: 0, notes: null };
  isLoading = false;
  showUpdateDialog = false;
  showTransferDialog = false;
  loadError = false; // لعرض رسالة الخطأ بدل التحميل اللانهائي

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
    private printService: PrintService
  ) {}

  ngOnInit(): void {
    this.loadFees();
    this.loadUsers();
  }

  loadFees(): void {
    this.isLoading = true;
    this.loadError = false;
    console.log('🔄 Loading fees...');
    this.feesService.getFees().subscribe({
      next: (res) => {
        console.log('✅ Fees API Response:', res);
        if (res.status && res.data) {
          this.fees = res.data;
          this.updateDto = {
            percentage: res.data.percentage,
            minimumFee: res.data.minimumFee
          };
        } else {
          console.warn('⚠️ Fees API returned status false or no data:', res);
          this.loadError = true;
          this.toaster.error(res.message || 'فشل تحميل بيانات الرسوم');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load fees:', err);
        this.loadError = true;
        this.toaster.error(err.error?.message || err.message || 'فشل تحميل بيانات الرسوم - تأكد من اتصال الخادم');
        this.isLoading = false;
      }
    });
  }

  loadUsers(): void {
    console.log('🔄 Loading users...');
    this.usersService.getUsers().subscribe({
      next: (res) => {
        console.log('✅ Users API Response:', res);
        if (res.status && res.data) {
          this.users = res.data;
          this.filteredUsers = res.data;
          console.log(`✅ Loaded ${res.data.length} users`);
        } else {
          console.warn('⚠️ Users API returned status false or no data:', res);
          this.toaster.error('فشل تحميل قائمة المستخدمين');
        }
      },
      error: (err) => {
        console.error('❌ Failed to load users:', err);
        this.toaster.error('فشل تحميل قائمة المستخدمين');
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
      this.toaster.error('نسبة الرسوم يجب أن تكون بين 0 و 100');
      return;
    }
    if (this.updateDto.minimumFee < 0) {
      this.toaster.error('الحد الأدنى للرسوم يجب أن يكون أكبر من أو يساوي 0');
      return;
    }
    this.showUpdateDialog = true;
  }

  openTransferDialog(): void {
    if (!this.transferDto.recipientUserId || this.transferDto.amount <= 0) {
      this.toaster.error('يرجى إدخال معرف المستلم والمبلغ');
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
          this.toaster.success('تم تحديث الرسوم بنجاح');
          this.loadFees();
        }
      },
      error: (err) => {
        this.toaster.error(err.message || 'فشل تحديث الرسوم');
        this.isLoading = false;
      }
    });
  }

  confirmTransfer(): void {
    this.showTransferDialog = false;
    this.isLoading = true;

    this.feesService.transferFees(this.transferDto).subscribe({
      next: (res) => {
        if (res.status) {
          this.toaster.success('تم تحويل الرسوم بنجاح');
          this.transferDto = { recipientUserId: '', amount: 0, notes: null };
          this.selectedUser = null;
          this.loadFees();
        }
      },
      error: (err) => {
        this.toaster.error(err.message || 'فشل تحويل الرسوم');
        this.isLoading = false;
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

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #02e600; margin-bottom: 20px;">إعدادات الرسوم الحالية</h2>
      </div>

      <div style="display: grid; gap: 20px;">
        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">نسبة رسوم المنصة</div>
          <div style="color: #02e600; font-size: 32px; font-weight: 700;">${this.fees.percentage}%</div>
        </div>

        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">الحد الأدنى للرسوم</div>
          <div style="color: #02e600; font-size: 32px; font-weight: 700;">${this.fees.minimumFee} ج.م</div>
        </div>

        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">آخر تحديث</div>
          <div style="color: #e0e0e0; font-size: 18px;">${this.formatDate(this.fees.updatedAt)}</div>
        </div>

        <div style="background: #252540; padding: 20px; border-radius: 12px; border-right: 4px solid #02e600;">
          <div style="color: #888; font-size: 14px; margin-bottom: 8px;">محدّث بواسطة</div>
          <div style="color: #e0e0e0; font-size: 18px;">${this.fees.updatedBy || 'النظام'}</div>
        </div>
      </div>
    `;

    this.printService.printContentToPdf(content, {
      title: 'تقرير الرسوم',
      filename: 'fees_report',
      orientation: 'portrait'
    });
  }
}
