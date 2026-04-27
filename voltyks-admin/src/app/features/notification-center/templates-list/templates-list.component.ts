import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { LanguageService } from '../../../core/services/language.service';
import { AdminNotificationsCenterService } from '../../../core/services/admin/admin-notifications-center.service';
import { NotificationTemplateDto } from '../../../core/models';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { TemplateEditorModalComponent } from '../template-editor-modal/template-editor-modal.component';

type Category = 'all' | 'charging' | 'process' | 'reports' | 'vehicle' | 'other';

@Component({
  selector: 'app-templates-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    LoadingOverlayComponent,
    ConfirmDialogComponent,
    TemplateEditorModalComponent
  ],
  templateUrl: './templates-list.component.html',
  styleUrls: ['./templates-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplatesListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  templates: NotificationTemplateDto[] = [];
  filtered: NotificationTemplateDto[] = [];

  searchTerm = '';
  category: Category = 'all';
  private searchSubject = new Subject<string>();

  isLoading = false;

  // Editor modal
  showEditor = false;
  selectedTemplate: NotificationTemplateDto | null = null;

  // Reset confirm
  showResetConfirm = false;
  resetTarget: NotificationTemplateDto | null = null;

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
    this.setupSearch();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────── Loading ─────────────────

  loadTemplates(forceRefresh = false): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.service.listTemplates(forceRefresh).subscribe({
      next: response => {
        if (response.status && response.data) {
          this.templates = response.data;
          this.applyFilters();
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.loadTemplatesFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toaster.error(err.message || this.t('notificationCenter.msg.loadTemplatesFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ───────────────── Filters ─────────────────

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
        this.cdr.markForCheck();
      });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  setCategory(cat: Category): void {
    this.category = cat;
    this.applyFilters();
  }

  private applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.templates.filter(t => {
      // Category filter
      if (this.category !== 'all' && this.categoryOf(t.key) !== this.category) {
        return false;
      }
      // Search filter
      if (term) {
        return (
          t.key.toLowerCase().includes(term) ||
          t.titleEn.toLowerCase().includes(term) ||
          t.titleAr.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }

  /**
   * Derive a category from the key prefix. Mapping is client-side because
   * the backend response doesn't carry a category field.
   */
  categoryOf(key: string): Category {
    const k = key.toLowerCase();
    if (k.startsWith('vehicleaddition')) return 'vehicle';
    if (k.startsWith('process') || k.includes('process')) return 'process';
    if (k.startsWith('report')) return 'reports';
    if (k.startsWith('chargerowner') || k.startsWith('vehicleowner') || k === 'submitrating') return 'charging';
    return 'other';
  }

  // ───────────────── Display helpers ─────────────────

  get currentLang(): 'ar' | 'en' {
    return this.langService.currentLanguage;
  }

  titleFor(t: NotificationTemplateDto): string {
    return this.currentLang === 'ar' ? t.titleAr : t.titleEn;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const locale = this.langService.currentLocale;
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  trackByKey(_: number, t: NotificationTemplateDto): string {
    return t.key;
  }

  // ───────────────── Actions ─────────────────

  openEditor(template: NotificationTemplateDto): void {
    this.selectedTemplate = template;
    this.showEditor = true;
    this.cdr.markForCheck();
  }

  closeEditor(): void {
    this.showEditor = false;
    this.selectedTemplate = null;
    this.cdr.markForCheck();
  }

  onTemplateSaved(updated: NotificationTemplateDto): void {
    // Replace in-place so the table reflects the new state without a refetch
    this.templates = this.templates.map(t => (t.key === updated.key ? updated : t));
    this.applyFilters();
    this.closeEditor();
    this.cdr.markForCheck();
  }

  onTemplateReset(reset: NotificationTemplateDto): void {
    this.templates = this.templates.map(t => (t.key === reset.key ? reset : t));
    this.applyFilters();
    this.closeEditor();
    this.cdr.markForCheck();
  }

  askReset(template: NotificationTemplateDto): void {
    this.resetTarget = template;
    this.showResetConfirm = true;
    this.cdr.markForCheck();
  }

  confirmReset(): void {
    if (!this.resetTarget) return;
    const target = this.resetTarget;
    this.showResetConfirm = false;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.service.resetTemplate(target.key).subscribe({
      next: response => {
        if (response.status) {
          this.toaster.success(this.t('notificationCenter.msg.resetSuccess'));
          // Refetch to get the fresh hardcoded fallback values
          this.service.getTemplate(target.key).subscribe({
            next: detail => {
              if (detail.status && detail.data) {
                this.templates = this.templates.map(x => (x.key === target.key ? detail.data : x));
                this.applyFilters();
              }
              this.isLoading = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.isLoading = false;
              this.loadTemplates(true);
            }
          });
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.resetFail'));
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      },
      error: err => {
        this.toaster.error(err.message || this.t('notificationCenter.msg.resetFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancelReset(): void {
    this.showResetConfirm = false;
    this.resetTarget = null;
    this.cdr.markForCheck();
  }

  // ───────────────── Stats ─────────────────

  get customisedCount(): number {
    return this.templates.filter(t => t.isCustomized).length;
  }
}
