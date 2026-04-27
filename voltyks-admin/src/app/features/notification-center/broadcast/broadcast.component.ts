import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { AdminNotificationsCenterService } from '../../../core/services/admin/admin-notifications-center.service';
import {
  NotificationTemplateDto,
  NotificationSendMode,
  BroadcastDto,
  BroadcastAudienceType,
  BroadcastRole
} from '../../../core/models';
import { LanguageService } from '../../../core/services/language.service';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { UserMultiPickerComponent } from '../shared/user-multi-picker/user-multi-picker.component';

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    LoadingOverlayComponent,
    ConfirmDialogComponent,
    UserMultiPickerComponent
  ],
  templateUrl: './broadcast.component.html',
  styleUrls: ['./broadcast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BroadcastComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Audience
  audienceType: BroadcastAudienceType = 'all';
  audienceRole: BroadcastRole = 'vehicle_owner';
  audienceUserIds: string[] = [];

  // Mode
  mode: NotificationSendMode = 'template';

  // Templates
  templates: NotificationTemplateDto[] = [];
  selectedTemplate: NotificationTemplateDto | null = null;
  templateParams: Record<string, string> = {};
  isTemplateDropdownOpen = false;

  // Custom
  custom = { titleEn: '', titleAr: '', bodyEn: '', bodyAr: '' };

  // State
  isLoadingTemplates = false;
  isSending = false;
  showConfirm = false;
  pendingDto: BroadcastDto | null = null;

  constructor(
    private service: AdminNotificationsCenterService,
    private toaster: ToasterService,
    private translate: TranslateService,
    private langService: LanguageService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  // ───────────────── Audience ─────────────────

  setAudience(type: BroadcastAudienceType): void {
    if (type === 'city') {
      // Spec says: backend returns "audience.type=city is not supported yet".
      // Block here client-side for clarity.
      this.toaster.warning(this.t('notificationCenter.msg.cityNotSupported'));
      return;
    }
    this.audienceType = type;
    this.cdr.markForCheck();
  }

  setRole(role: BroadcastRole): void {
    this.audienceRole = role;
    this.cdr.markForCheck();
  }

  onUserIdsChange(ids: string[]): void {
    this.audienceUserIds = ids;
    this.cdr.markForCheck();
  }

  setMode(mode: NotificationSendMode): void {
    this.mode = mode;
    this.cdr.markForCheck();
  }

  // ───────────────── Submit flow ─────────────────

  resetForm(): void {
    this.audienceType = 'all';
    this.audienceRole = 'vehicle_owner';
    this.audienceUserIds = [];
    this.selectedTemplate = null;
    this.templateParams = {};
    this.custom = { titleEn: '', titleAr: '', bodyEn: '', bodyAr: '' };
    this.cdr.markForCheck();
  }

  estimateCount(): string {
    if (this.audienceType === 'all') return '?';
    if (this.audienceType === 'role') return '?';
    if (this.audienceType === 'users') return String(this.audienceUserIds.length);
    return '?';
  }

  /**
   * Validate & build the DTO. Pops up the confirm dialog before
   * actually firing the request.
   */
  prepare(): void {
    // Audience validation
    if (this.audienceType === 'users' && this.audienceUserIds.length === 0) {
      this.toaster.error(this.t('notificationCenter.msg.pickAtLeastOneUser'));
      return;
    }

    // Build payload
    const dto: BroadcastDto = {
      audience: this.buildAudience(),
      mode: this.mode
    };

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
      dto.template = { key: this.selectedTemplate.key, params: { ...this.templateParams } };
    } else {
      if (!this.custom.titleEn.trim() || !this.custom.bodyEn.trim()) {
        this.toaster.error(this.t('notificationCenter.msg.fillCustomMessage'));
        return;
      }
      dto.custom = { ...this.custom };
    }

    this.pendingDto = dto;
    this.showConfirm = true;
    this.cdr.markForCheck();
  }

  private buildAudience() {
    switch (this.audienceType) {
      case 'all':
        return { type: 'all' as const };
      case 'role':
        return { type: 'role' as const, role: this.audienceRole };
      case 'users':
        return { type: 'users' as const, userIds: [...this.audienceUserIds] };
      default:
        return { type: 'all' as const };
    }
  }

  cancelConfirm(): void {
    this.showConfirm = false;
    this.pendingDto = null;
    this.cdr.markForCheck();
  }

  confirmSend(): void {
    if (!this.pendingDto) return;
    const dto = this.pendingDto;
    this.showConfirm = false;
    this.isSending = true;
    this.pendingDto = null;
    this.cdr.markForCheck();

    this.service.broadcast(dto).subscribe({
      next: response => {
        if (response.status && response.data) {
          const r = response.data;
          this.toaster.success(
            this.t('notificationCenter.msg.broadcastSuccess', {
              recipients: r.recipientCount,
              succeeded: r.fcmSucceededCount,
              attempted: r.fcmAttemptedCount
            })
          );
          this.resetForm();
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.broadcastFail'));
        }
        this.isSending = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toaster.error(err?.error?.message || err?.message || this.t('notificationCenter.msg.broadcastFail'));
        this.isSending = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ───────────────── Outside-click ─────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isTemplateDropdownOpen) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.template-dropdown')) {
      this.isTemplateDropdownOpen = false;
      this.cdr.markForCheck();
    }
  }

  trackByTemplateKey(_: number, t: NotificationTemplateDto): string {
    return t.key;
  }
}
