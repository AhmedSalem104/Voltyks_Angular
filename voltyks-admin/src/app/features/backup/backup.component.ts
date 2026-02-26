import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminBackupService } from '../../core/services/admin/admin-backup.service';
import { BackupResultDto, BackupFileDto } from '../../core/models/backup.model';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { VaultService } from '../../core/services/vault.service';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingOverlayComponent, PaginationComponent],
  templateUrl: './backup.component.html',
  styleUrls: ['./backup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackupComponent implements OnInit, OnDestroy {
  backups: BackupFileDto[] = [];
  lastResult: BackupResultDto | null = null;
  isLoading = false;
  isTriggering = false;
  downloadingFile: string | null = null;

  // Date filter
  dateFrom = '';
  dateTo = '';
  activePreset: string | null = 'today';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  constructor(
    private backupService: AdminBackupService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef,
    private vaultService: VaultService
  ) {}

  ngOnInit(): void {
    this.setToday();
    this.loadBackups();
  }

  ngOnDestroy(): void {
    this.vaultService.lock();
  }

  private setToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.dateFrom = today;
    this.dateTo = today;
    this.activePreset = 'today';
  }

  loadBackups(): void {
    this.isLoading = true;
    this.backupService.listBackups().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.backups = response.data.files || [];
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.error?.message || 'فشل تحميل قائمة النسخ الاحتياطية');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  triggerBackup(): void {
    this.isTriggering = true;
    this.lastResult = null;
    this.backupService.triggerBackup().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.lastResult = response.data;
          this.toaster.success('تم إنشاء النسخة الاحتياطية بنجاح');
          this.loadBackups();
        } else {
          this.toaster.error(response.message || 'فشل إنشاء النسخة الاحتياطية');
        }
        this.isTriggering = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.error?.message || 'فشل إنشاء النسخة الاحتياطية');
        this.isTriggering = false;
        this.cdr.markForCheck();
      }
    });
  }

  downloadBackup(fileName: string): void {
    this.downloadingFile = fileName;
    this.cdr.markForCheck();

    this.backupService.downloadBackup(fileName).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.toaster.success('جاري تحميل الملف');
        this.downloadingFile = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toaster.error('فشل تحميل الملف');
        this.downloadingFile = null;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredBackups(): BackupFileDto[] {
    if (!this.dateFrom && !this.dateTo) return this.backups;
    return this.backups.filter(b => {
      const d = new Date(b.createdAt);
      if (this.dateFrom && d < new Date(this.dateFrom)) return false;
      if (this.dateTo) {
        const to = new Date(this.dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }

  setPreset(preset: string): void {
    this.activePreset = preset;
    this.currentPage = 1;
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    this.dateTo = fmt(now);

    switch (preset) {
      case 'today':
        this.dateFrom = fmt(now);
        break;
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        this.dateFrom = fmt(d);
        break;
      }
      case 'month': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        this.dateFrom = fmt(d);
        break;
      }
      case 'year': {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 1);
        this.dateFrom = fmt(d);
        break;
      }
      case 'all':
        this.dateFrom = '';
        this.dateTo = '';
        break;
    }
    this.cdr.markForCheck();
  }

  clearFilter(): void {
    this.setToday();
    this.cdr.markForCheck();
  }

  onDateChange(): void {
    this.activePreset = null;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  get paginatedBackups(): BackupFileDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredBackups.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.cdr.markForCheck();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  get hasFilter(): boolean {
    return this.activePreset !== 'all' && (!!this.dateFrom || !!this.dateTo);
  }

  formatSize(mb: number): string {
    if (mb == null) return '-';
    if (mb >= 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(2) + ' MB';
  }

  formatDate(dateString: string): string {
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

  formatDuration(seconds: number): string {
    if (seconds == null) return '-';
    if (seconds < 1) return (seconds * 1000).toFixed(0) + 'ms';
    return seconds.toFixed(1) + 's';
  }
}
