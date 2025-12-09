import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, NgxJsonViewerModule, LoadingOverlayComponent],
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss']
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
    private printService: PrintService
  ) {}

  ngOnInit(): void {
    this.loadTerms();
  }

  loadTerms(): void {
    this.isLoading = true;
    console.log('Loading terms for language:', this.selectedLang);

    this.termsService.getTerms(this.selectedLang).subscribe({
      next: (res) => {
        console.log('Terms API response:', res);

        if (res.status && res.data) {
          this.terms = res.data;

          // Parse content if it's a JSON string
          try {
            if (typeof this.terms.content === 'string') {
              this.jsonData = JSON.parse(this.terms.content);
            } else {
              this.jsonData = this.terms.content;
            }
          } catch (e) {
            // If parsing fails, display as is
            this.jsonData = { content: this.terms.content };
          }

          console.log('Terms loaded successfully:', this.terms);
          console.log('Parsed JSON data:', this.jsonData);
        } else {
          console.warn('Terms API returned no data or status is false');
          this.toaster.error('لم يتم العثور على شروط وأحكام لهذه اللغة');
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading terms:', err);
        const errorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء تحميل الشروط والأحكام';
        this.toaster.error(errorMessage);
        this.isLoading = false;
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
    return this.selectedLang === 'ar' ? 'العربية' : 'English';
  }

  get otherLanguageLabel(): string {
    return this.selectedLang === 'ar' ? 'English' : 'العربية';
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
      this.jsonError = e.message || 'JSON غير صالح';
    }
  }

  formatJson(): void {
    try {
      const parsed = JSON.parse(this.editedContent);
      this.editedContent = JSON.stringify(parsed, null, 2);
      this.isJsonValid = true;
      this.jsonError = '';
      this.toaster.success('تم تنسيق JSON بنجاح');
    } catch (e: any) {
      this.toaster.error('لا يمكن تنسيق JSON غير صالح');
    }
  }

  saveTerms(): void {
    console.log('=== saveTerms called ===');
    console.log('Current terms:', this.terms);
    console.log('Selected language:', this.selectedLang);
    console.log('Edit mode:', this.isEditMode);
    console.log('Edited content:', this.editedContent);

    if (!this.terms) {
      console.error('No terms data available');
      alert('لا توجد بيانات للحفظ');
      this.toaster.error('لا توجد بيانات للحفظ');
      return;
    }

    // Validate JSON before saving
    this.validateJson();
    console.log('JSON validation result:', this.isJsonValid, this.jsonError);

    if (!this.isJsonValid) {
      console.error('Invalid JSON:', this.jsonError);
      alert(`JSON غير صالح: ${this.jsonError}`);
      this.toaster.error('يرجى تصحيح أخطاء JSON قبل الحفظ');
      return;
    }

    this.isLoading = true;
    console.log('Starting save process...');

    // Parse the edited content
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(this.editedContent);
      console.log('Parsed content successfully:', parsedContent);
    } catch (e: any) {
      console.error('Failed to parse JSON:', e);
      alert(`خطأ في تنسيق JSON: ${e.message}`);
      this.toaster.error(`خطأ في تنسيق JSON: ${e.message}`);
      this.isLoading = false;
      return;
    }

    // Update the terms content
    // Send content as object (not string) to backend
    const updatedTerms: UpdateTermsDto = {
      lang: this.selectedLang,
      content: parsedContent
    };

    console.log('=== Sending update request ===');
    console.log('Request data:', updatedTerms);
    console.log('Request URL: PUT /api/admin/terms');

    this.termsService.updateTerms(updatedTerms).subscribe({
      next: (res) => {
        console.log('=== Update response received ===');
        console.log('Response:', res);

        if (res.status) {
          console.log('✓ Update successful');
          this.toaster.success('تم حفظ التعديلات بنجاح');
          this.jsonData = parsedContent;
          // Reload terms to get fresh data from backend
          this.loadTerms();
          this.isEditMode = false;
          this.editedContent = '';
        } else {
          console.error('✗ Update failed - status false');
          console.error('Response message:', res.message);
          alert(`فشل الحفظ: ${res.message || 'خطأ غير معروف'}`);
          this.toaster.error(res.message || 'فشل حفظ التعديلات');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('=== Update error ===');
        console.error('Error object:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error response:', err.error);

        const errorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء حفظ التعديلات';
        alert(`خطأ في الحفظ: ${errorMessage}`);
        this.toaster.error(errorMessage);
        this.isLoading = false;
      }
    });
  }

  printToPdf(): void {
    if (!this.jsonData) return;
    const content = this.formatJsonForPrint(this.jsonData);
    this.printService.printContentToPdf(content, {
      title: `الشروط والأحكام - ${this.languageLabel}`,
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
