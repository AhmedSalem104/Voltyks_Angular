import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { AdminTermsService } from '../../core/services/admin/admin-terms.service';
import { AdminTermsDto, UpdateTermsDto } from '../../core/models';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxJsonViewerModule, LoadingOverlayComponent, TranslatePipe],
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermsComponent implements OnInit {
  terms?: AdminTermsDto;
  selectedLang: 'ar' | 'en' = 'ar';
  isLoading = false;
  jsonData: any = null;

  // Edit mode properties
  isEditMode = false;
  editedContent = '';
  isJsonValid = true;
  jsonError = '';

  constructor(
    private termsService: AdminTermsService,
    private toaster: ToasterService,
    private printService: PrintService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.loadTerms();
  }

  loadTerms(): void {
    this.isLoading = true;

    this.termsService.getTerms(this.selectedLang).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.terms = res.data;

          // Parse content if it's a JSON string
          try {
            if (typeof this.terms.content === 'string') {
              this.jsonData = JSON.parse(this.terms.content);
            } else {
              this.jsonData = this.terms.content;
            }
          } catch {
            // If parsing fails, display as is
            this.jsonData = { content: this.terms.content };
          }
        } else {
          this.toaster.error(this.t('terms.msg.notFound'));
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || this.t('terms.msg.loadError');
        this.toaster.error(errorMessage);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleLanguage(): void {
    this.selectedLang = this.selectedLang === 'ar' ? 'en' : 'ar';
    this.loadTerms();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get languageLabel(): string {
    return this.t(this.selectedLang === 'ar' ? 'terms.langArabic' : 'terms.langEnglish');
  }

  get otherLanguageLabel(): string {
    return this.t(this.selectedLang === 'ar' ? 'terms.langEnglish' : 'terms.langArabic');
  }

  // Edit mode methods
  toggleEditMode(): void {
    if (this.isEditMode) {
      // Cancel edit mode
      this.isEditMode = false;
      this.editedContent = '';
      this.isJsonValid = true;
      this.jsonError = '';
    } else {
      // Enter edit mode
      this.isEditMode = true;
      // Format JSON with 2 spaces indentation
      this.editedContent = JSON.stringify(this.jsonData, null, 2);
      // Validate the initial JSON
      this.validateJson();
    }
  }

  validateJson(): void {
    try {
      JSON.parse(this.editedContent);
      this.isJsonValid = true;
      this.jsonError = '';
    } catch (e: any) {
      this.isJsonValid = false;
      this.jsonError = e.message || this.t('terms.msg.invalidJson');
    }
  }

  formatJson(): void {
    try {
      const parsed = JSON.parse(this.editedContent);
      this.editedContent = JSON.stringify(parsed, null, 2);
      this.isJsonValid = true;
      this.jsonError = '';
      this.toaster.success(this.t('terms.msg.formatSuccess'));
    } catch (e: any) {
      this.toaster.error(this.t('terms.msg.formatInvalid'));
    }
  }

  saveTerms(): void {
    if (!this.terms) {
      this.toaster.error(this.t('terms.msg.noData'));
      return;
    }

    // Validate JSON before saving
    this.validateJson();

    if (!this.isJsonValid) {
      this.toaster.error(this.t('terms.msg.fixErrors'));
      return;
    }

    this.isLoading = true;

    // Parse the edited content
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(this.editedContent);
    } catch (e: any) {
      this.toaster.error(this.t('terms.msg.formatError', { message: e.message }));
      this.isLoading = false;
      return;
    }

    // Update the terms content
    const updatedTerms: UpdateTermsDto = {
      lang: this.selectedLang,
      content: parsedContent
    };

    this.termsService.updateTerms(updatedTerms).subscribe({
      next: (res) => {
        if (res.status) {
          this.toaster.success(this.t('terms.msg.saveSuccess'));
          this.jsonData = parsedContent;
          // Reload terms to get fresh data from backend
          this.loadTerms();
          this.isEditMode = false;
          this.editedContent = '';
        } else {
          this.toaster.error(res.message || this.t('terms.msg.saveFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || this.t('terms.msg.saveError');
        this.toaster.error(errorMessage);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  printToPdf(): void {
    if (!this.jsonData) return;
    const content = this.formatJsonForPrint(this.jsonData);
    this.printService.printContentToPdf(content, {
      title: this.t('terms.msg.printTitle', { lang: this.languageLabel }),
      filename: `terms_${this.selectedLang}`,
      orientation: 'portrait'
    });
  }

  private formatJsonForPrint(obj: any, indent: number = 0): string {
    let result = '';
    const padding = '&nbsp;'.repeat(indent * 4);

    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          result += `${padding}<div style="margin-bottom: 8px;">${index + 1}. ${this.formatJsonForPrint(item, indent + 1)}</div>`;
        });
      } else {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
              result += `${padding}<div style="margin-bottom: 12px; color: #02e600; font-weight: 600;">${key}:</div>`;
              result += this.formatJsonForPrint(value, indent + 1);
            } else {
              result += `${padding}<div style="margin-bottom: 8px;"><span style="color: #02e600;">${key}:</span> ${value}</div>`;
            }
          }
        }
      }
    } else {
      result = String(obj);
    }

    return result;
  }
}
