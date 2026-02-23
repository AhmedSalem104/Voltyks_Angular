import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminBackupService } from '../../core/services/admin/admin-backup.service';
import { BackupResultDto, BackupFileDto } from '../../core/models/backup.model';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, LoadingOverlayComponent],
  templateUrl: './backup.component.html',
  styleUrls: ['./backup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackupComponent implements OnInit {
  backups: BackupFileDto[] = [];
  lastResult: BackupResultDto | null = null;
  isLoading = false;
  isTriggering = false;
  downloadingFile: string | null = null;

  constructor(
    private backupService: AdminBackupService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBackups();
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
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
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
