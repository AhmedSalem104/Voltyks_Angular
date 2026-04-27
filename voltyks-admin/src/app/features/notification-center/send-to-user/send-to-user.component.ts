import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { AdminUsersService } from '../../../core/services/admin/admin-users.service';
import { AdminNotificationsCenterService } from '../../../core/services/admin/admin-notifications-center.service';
import {
  AdminUserDto,
  NotificationTemplateDto,
  NotificationSendMode,
  SendToUserDto
} from '../../../core/models';
import { LanguageService } from '../../../core/services/language.service';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-send-to-user',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LoadingOverlayComponent],
  templateUrl: './send-to-user.component.html',
  styleUrls: ['./send-to-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SendToUserComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Users
  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  selectedUser: AdminUserDto | null = null;
  userSearchTerm = '';
  isUserDropdownOpen = false;

  // Templates
  templates: NotificationTemplateDto[] = [];
  selectedTemplate: NotificationTemplateDto | null = null;
  templateParams: Record<string, string> = {};
  isTemplateDropdownOpen = false;

  // Mode
  mode: NotificationSendMode = 'template';

  // Custom message
  custom = { titleEn: '', titleAr: '', bodyEn: '', bodyAr: '' };

  // State
  isLoadingUsers = false;
  isLoadingTemplates = false;
  isSending = false;

  constructor(
    private usersService: AdminUsersService,
    private service: AdminNotificationsCenterService,
    private toaster: ToasterService,
    private translate: TranslateService,
    private langService: LanguageService,
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────── Users ─────────────────

  private loadUsers(): void {
    this.isLoadingUsers = true;
    this.cdr.markForCheck();

    this.usersService.getUsers().subscribe({
      next: response => {
        if (response.status && response.data) {
          this.users = response.data.filter(u => !u.isDeleted && !u.isBanned);
          this.filteredUsers = [...this.users];
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.loadUsersFail'));
        }
        this.isLoadingUsers = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toaster.error(err.message || this.t('notificationCenter.msg.loadUsersFail'));
        this.isLoadingUsers = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    this.cdr.markForCheck();
  }

  filterUsers(): void {
    const term = this.userSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(
        u =>
          u.fullName?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.phoneNumber?.includes(term)
      );
    }
    this.cdr.markForCheck();
  }

  selectUser(user: AdminUserDto): void {
    this.selectedUser = user;
    this.isUserDropdownOpen = false;
    this.cdr.markForCheck();
  }

  clearUser(event?: Event): void {
    event?.stopPropagation();
    this.selectedUser = null;
    this.cdr.markForCheck();
  }

  // ───────────────── Templates ─────────────────

  private loadTemplates(): void {
    this.isLoadingTemplates = true;
    this.cdr.markForCheck();

    this.service.listTemplates().subscribe({
      next: response => {
        if (response.status && response.data) {
          this.templates = response.data;
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.loadTemplatesFail'));
        }
        this.isLoadingTemplates = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toaster.error(err.message || this.t('notificationCenter.msg.loadTemplatesFail'));
        this.isLoadingTemplates = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleTemplateDropdown(): void {
    this.isTemplateDropdownOpen = !this.isTemplateDropdownOpen;
    this.cdr.markForCheck();
  }

  selectTemplate(template: NotificationTemplateDto): void {
    this.selectedTemplate = template;
    this.isTemplateDropdownOpen = false;
    // Seed param inputs (preserve any existing values for matching keys)
    const next: Record<string, string> = {};
    for (const p of template.requiredParams) {
      next[p] = this.templateParams[p] ?? '';
    }
    this.templateParams = next;
    this.cdr.markForCheck();
  }

  templateLabel(t: NotificationTemplateDto): string {
    return this.langService.currentLanguage === 'ar' ? t.titleAr : t.titleEn;
  }

  // ───────────────── Mode ─────────────────

  setMode(mode: NotificationSendMode): void {
    this.mode = mode;
    this.cdr.markForCheck();
  }

  // ───────────────── Submit ─────────────────

  resetForm(): void {
    this.selectedUser = null;
    this.userSearchTerm = '';
    this.selectedTemplate = null;
    this.templateParams = {};
    this.custom = { titleEn: '', titleAr: '', bodyEn: '', bodyAr: '' };
    this.cdr.markForCheck();
  }

  send(): void {
    if (!this.selectedUser) {
      this.toaster.error(this.t('notificationCenter.msg.pickUser'));
      return;
    }

    let dto: SendToUserDto;
    if (this.mode === 'template') {
      if (!this.selectedTemplate) {
        this.toaster.error(this.t('notificationCenter.msg.pickTemplate'));
        return;
      }
      const required = this.selectedTemplate.requiredParams;
      const missing = required.filter(p => !this.templateParams[p]?.trim());
      if (missing.length > 0) {
        this.toaster.error(this.t('notificationCenter.msg.fillRequiredParams'));
        return;
      }
      dto = {
        userId: this.selectedUser.id,
        mode: 'template',
        template: { key: this.selectedTemplate.key, params: { ...this.templateParams } }
      };
    } else {
      if (!this.custom.titleEn.trim() || !this.custom.bodyEn.trim()) {
        this.toaster.error(this.t('notificationCenter.msg.fillCustomMessage'));
        return;
      }
      dto = {
        userId: this.selectedUser.id,
        mode: 'custom',
        custom: { ...this.custom }
      };
    }

    this.isSending = true;
    this.cdr.markForCheck();

    this.service.sendToUser(dto).subscribe({
      next: response => {
        if (response.status && response.data) {
          const { notificationId, pushSent } = response.data;
          if (pushSent > 0) {
            this.toaster.success(
              this.t('notificationCenter.msg.sendSuccess', { id: notificationId, push: pushSent })
            );
          } else {
            this.toaster.warning(
              this.t('notificationCenter.msg.sendSuccessNoPush', { id: notificationId })
            );
          }
          this.resetForm();
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.sendFail'));
        }
        this.isSending = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toaster.error(err?.error?.message || err?.message || this.t('notificationCenter.msg.sendFail'));
        this.isSending = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ───────────────── Outside-click handler ─────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isUserDropdownOpen && !target.closest('.user-dropdown')) {
      this.isUserDropdownOpen = false;
      this.cdr.markForCheck();
    }
    if (this.isTemplateDropdownOpen && !target.closest('.template-dropdown')) {
      this.isTemplateDropdownOpen = false;
      this.cdr.markForCheck();
    }
  }

  trackByUserId(_: number, u: AdminUserDto): string {
    return u.id;
  }

  trackByTemplateKey(_: number, t: NotificationTemplateDto): string {
    return t.key;
  }
}
