import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChildren,
  QueryList,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import {
  AdminNotificationsCenterService,
  validateTemplateUpdate
} from '../../../core/services/admin/admin-notifications-center.service';
import {
  NotificationTemplateDto,
  PreviewResponseDto,
  UpdateTemplateDto
} from '../../../core/models';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';

type FieldKey = 'titleEn' | 'bodyEn' | 'titleAr' | 'bodyAr';
type PreviewLang = 'en' | 'ar';

@Component({
  selector: 'app-template-editor-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './template-editor-modal.component.html',
  styleUrls: ['./template-editor-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateEditorModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) template!: NotificationTemplateDto;
  @Output() saved = new EventEmitter<NotificationTemplateDto>();
  @Output() resetDone = new EventEmitter<NotificationTemplateDto>();
  @Output() closed = new EventEmitter<void>();

  @ViewChildren('fieldInput') fieldInputs!: QueryList<ElementRef<HTMLTextAreaElement | HTMLInputElement>>;

  private destroy$ = new Subject<void>();
  private previewSubject = new Subject<void>();

  // Editable form state
  draft: UpdateTemplateDto = { titleEn: '', titleAr: '', bodyEn: '', bodyAr: '' };

  // Sample param values for preview
  sampleParams: Record<string, string> = {};

  // Preview state
  previewLang: PreviewLang = 'en';
  preview: PreviewResponseDto | null = null;
  isPreviewLoading = false;

  // Save state
  isSaving = false;

  // Reset confirm
  showResetConfirm = false;

  // Validation
  missingEn: string[] = [];
  missingAr: string[] = [];

  // Last focused textarea — used to insert placeholder at cursor
  private lastFocusedField: FieldKey = 'bodyEn';

  constructor(
    private service: AdminNotificationsCenterService,
    private toaster: ToasterService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    // Seed the draft with the current template values
    this.draft = {
      titleEn: this.template.titleEn ?? '',
      titleAr: this.template.titleAr ?? '',
      bodyEn: this.template.bodyEn ?? '',
      bodyAr: this.template.bodyAr ?? ''
    };

    // Seed sample params with the placeholder name itself so admins see
    // "{stationOwnerName}" → "stationOwnerName" rendered until they
    // override the value.
    this.sampleParams = {};
    for (const p of this.template.requiredParams) {
      this.sampleParams[p] = p;
    }

    this.runValidation();

    // Debounced live preview
    this.previewSubject
      .pipe(debounceTime(450), takeUntil(this.destroy$))
      .subscribe(() => this.fetchPreview());

    // Initial preview
    this.previewSubject.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────── Form events ─────────────────

  onFieldChange(): void {
    this.runValidation();
    this.previewSubject.next();
  }

  onFieldFocus(field: FieldKey): void {
    this.lastFocusedField = field;
  }

  onParamChange(): void {
    this.previewSubject.next();
  }

  // ───────────────── Validation ─────────────────

  private runValidation(): void {
    const result = validateTemplateUpdate(this.template.requiredParams, this.draft);
    this.missingEn = result.missingEn;
    this.missingAr = result.missingAr;
    this.cdr.markForCheck();
  }

  get hasValidationErrors(): boolean {
    return this.missingEn.length > 0 || this.missingAr.length > 0;
  }

  // ───────────────── Placeholder insertion ─────────────────

  insertPlaceholder(name: string): void {
    const fieldRef = this.fieldRefByKey(this.lastFocusedField);
    if (!fieldRef) return;

    const el = fieldRef.nativeElement;
    const placeholder = `{${name}}`;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const next = before + placeholder + after;

    // Update both the model and the DOM
    this.draft = { ...this.draft, [this.lastFocusedField]: next };
    setTimeout(() => {
      el.value = next;
      el.focus();
      const cursor = start + placeholder.length;
      el.setSelectionRange(cursor, cursor);
      this.runValidation();
      this.previewSubject.next();
    }, 0);
  }

  private fieldRefByKey(key: FieldKey): ElementRef<HTMLTextAreaElement | HTMLInputElement> | null {
    const map: Record<FieldKey, string> = {
      titleEn: 'titleEn',
      bodyEn: 'bodyEn',
      titleAr: 'titleAr',
      bodyAr: 'bodyAr'
    };
    const target = map[key];
    return this.fieldInputs?.find(r => r.nativeElement.getAttribute('data-field') === target) ?? null;
  }

  // ───────────────── Preview ─────────────────

  setPreviewLang(lang: PreviewLang): void {
    this.previewLang = lang;
    this.previewSubject.next();
  }

  private fetchPreview(): void {
    if (!this.template) return;

    this.isPreviewLoading = true;
    this.cdr.markForCheck();

    this.service
      .previewTemplate(this.template.key, {
        lang: this.previewLang,
        params: this.sampleParams
      })
      .subscribe({
        next: response => {
          if (response.status && response.data) {
            this.preview = response.data;
          } else {
            this.preview = null;
          }
          this.isPreviewLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          // Silent — preview failures shouldn't block editing.
          this.preview = null;
          this.isPreviewLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ───────────────── Save / Reset / Close ─────────────────

  save(): void {
    this.runValidation();
    if (this.hasValidationErrors) {
      const lang = this.missingEn.length > 0
        ? this.t('notificationCenter.editor.langEnglish')
        : this.t('notificationCenter.editor.langArabic');
      const list = (this.missingEn.length > 0 ? this.missingEn : this.missingAr).join(', ');
      this.toaster.error(this.t('notificationCenter.editor.validationMissingMulti', { lang, list }));
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    this.service.updateTemplate(this.template.key, this.draft).subscribe({
      next: response => {
        if (response.status && response.data) {
          this.toaster.success(this.t('notificationCenter.msg.saveSuccess'));
          this.saved.emit(response.data);
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.saveFail'));
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toaster.error(err?.error?.message || err?.message || this.t('notificationCenter.msg.saveFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  askReset(): void {
    this.showResetConfirm = true;
    this.cdr.markForCheck();
  }

  confirmReset(): void {
    this.showResetConfirm = false;
    this.isSaving = true;
    this.cdr.markForCheck();

    this.service.resetTemplate(this.template.key).subscribe({
      next: response => {
        if (response.status) {
          this.toaster.success(this.t('notificationCenter.msg.resetSuccess'));
          // Refetch the fresh hardcoded fallback for the updated state
          this.service.getTemplate(this.template.key).subscribe({
            next: detail => {
              if (detail.status && detail.data) {
                this.resetDone.emit(detail.data);
              }
              this.isSaving = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.isSaving = false;
              this.cdr.markForCheck();
              this.closed.emit();
            }
          });
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.resetFail'));
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      },
      error: err => {
        this.toaster.error(err?.error?.message || err?.message || this.t('notificationCenter.msg.resetFail'));
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancelReset(): void {
    this.showResetConfirm = false;
    this.cdr.markForCheck();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }
}
