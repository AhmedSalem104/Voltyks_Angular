import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AdminComplaintCategoriesService } from '../../core/services/admin/admin-complaint-categories.service';
import { AdminComplaintsService } from '../../core/services/admin/admin-complaints.service';
import {
  AdminComplaintCategoryDto,
  CreateComplaintCategoryDto,
  UpdateComplaintCategoryDto,
  CreateGeneralComplaintDto
} from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent
  , TranslatePipe],
  templateUrl: './complaints.component.html',
  styleUrls: ['./complaints.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComplaintsComponent implements OnInit {
  // Categories data
  categories: AdminComplaintCategoryDto[] = [];
  filteredCategories: AdminComplaintCategoryDto[] = [];
  paginatedCategories: AdminComplaintCategoryDto[] = [];

  // Filters
  searchTerm = '';
  showDeleted = false;

  // Loading states
  isLoading = false;
  isSaving = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCategories = 0;

  // Modal states
  showCategoryModal = false;
  showComplaintModal = false;
  showDeleteConfirm = false;
  isEditMode = false;

  // Form data
  categoryForm: CreateComplaintCategoryDto | UpdateComplaintCategoryDto = {
    name: '',
    description: ''
  };
  editingCategoryId: number | null = null;
  deletingCategory: AdminComplaintCategoryDto | null = null;

  // Complaint form
  complaintForm: CreateGeneralComplaintDto = {
    categoryId: 0,
    content: ''
  };

  // Stats
  totalActiveCategories = 0;
  totalDeletedCategories = 0;
  totalComplaints = 0;

  constructor(
    private categoriesService: AdminComplaintCategoriesService,
    private complaintsService: AdminComplaintsService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;

    this.categoriesService.getCategories({ includeDeleted: this.showDeleted }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.categories = response.data;
          this.calculateStats();
          this.applyFilters();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.message || 'فشل تحميل أنواع الشكاوى');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  calculateStats(): void {
    this.totalActiveCategories = this.categories.filter(c => !c.isDeleted).length;
    this.totalDeletedCategories = this.categories.filter(c => c.isDeleted).length;
    this.totalComplaints = this.categories.reduce((sum, c) => sum + c.complaintsCount, 0);
  }

  applyFilters(): void {
    let result = [...this.categories];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(category =>
        category.name.toLowerCase().includes(term) ||
        category.description?.toLowerCase().includes(term)
      );
    }

    this.filteredCategories = result;
    this.totalCategories = this.filteredCategories.length;
    this.currentPage = 1;
    this.updatePaginatedCategories();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onShowDeletedChange(): void {
    this.loadCategories();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedCategories();
  }

  private updatePaginatedCategories(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCategories = this.filteredCategories.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  // Category Modal Methods
  openAddCategoryModal(): void {
    this.isEditMode = false;
    this.categoryForm = { name: '', description: '' };
    this.editingCategoryId = null;
    this.showCategoryModal = true;
  }

  openEditCategoryModal(category: AdminComplaintCategoryDto): void {
    this.isEditMode = true;
    this.categoryForm = {
      name: category.name,
      description: category.description || ''
    };
    this.editingCategoryId = category.id;
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.categoryForm = { name: '', description: '' };
    this.editingCategoryId = null;
  }

  saveCategory(): void {
    if (!this.categoryForm.name.trim()) {
      this.toaster.error('اسم نوع الشكوى مطلوب');
      return;
    }

    this.isSaving = true;

    if (this.isEditMode && this.editingCategoryId) {
      this.categoriesService.updateCategory(this.editingCategoryId, this.categoryForm as UpdateComplaintCategoryDto).subscribe({
        next: (response) => {
          if (response.status) {
            this.toaster.success('تم تحديث نوع الشكوى بنجاح');
            this.closeCategoryModal();
            this.loadCategories();
          } else {
            this.toaster.error(response.message || 'فشل تحديث نوع الشكوى');
          }
          this.isSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'فشل تحديث نوع الشكوى');
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.categoriesService.createCategory(this.categoryForm as CreateComplaintCategoryDto).subscribe({
        next: (response) => {
          if (response.status) {
            this.toaster.success('تم إضافة نوع الشكوى بنجاح');
            this.closeCategoryModal();
            this.loadCategories();
          } else {
            this.toaster.error(response.message || 'فشل إضافة نوع الشكوى');
          }
          this.isSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'فشل إضافة نوع الشكوى');
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  // Delete Methods
  confirmDelete(category: AdminComplaintCategoryDto): void {
    this.deletingCategory = category;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.deletingCategory = null;
    this.showDeleteConfirm = false;
  }

  deleteCategory(): void {
    if (!this.deletingCategory) return;

    this.isSaving = true;
    this.categoriesService.deleteCategory(this.deletingCategory.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف نوع الشكوى بنجاح');
          this.cancelDelete();
          this.loadCategories();
        } else {
          this.toaster.error(response.message || 'فشل حذف نوع الشكوى');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'فشل حذف نوع الشكوى');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Restore Method
  restoreCategory(category: AdminComplaintCategoryDto): void {
    this.categoriesService.restoreCategory(category.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم استعادة نوع الشكوى بنجاح');
          this.loadCategories();
        } else {
          this.toaster.error(response.message || 'فشل استعادة نوع الشكوى');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'فشل استعادة نوع الشكوى');
        this.cdr.markForCheck();
      }
    });
  }

  // Complaint Modal Methods
  openComplaintModal(): void {
    this.complaintForm = { categoryId: 0, content: '' };
    this.showComplaintModal = true;
  }

  closeComplaintModal(): void {
    this.showComplaintModal = false;
    this.complaintForm = { categoryId: 0, content: '' };
  }

  submitComplaint(): void {
    if (!this.complaintForm.categoryId) {
      this.toaster.error('يرجى اختيار نوع الشكوى');
      return;
    }
    if (!this.complaintForm.content.trim()) {
      this.toaster.error('محتوى الشكوى مطلوب');
      return;
    }

    this.isSaving = true;
    this.complaintsService.createComplaint(this.complaintForm).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إرسال الشكوى بنجاح');
          this.closeComplaintModal();
          this.loadCategories(); // Refresh to update complaints count
        } else {
          this.toaster.error(response.message || 'فشل إرسال الشكوى');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toaster.error(err.error?.message || 'فشل إرسال الشكوى');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Utility Methods
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateLong(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActiveCategories(): AdminComplaintCategoryDto[] {
    return this.categories.filter(c => !c.isDeleted);
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير أنواع الشكاوى',
      filename: 'complaint_categories_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'اسم النوع', field: 'name' },
        { header: 'الوصف', field: 'descriptionShort' },
        { header: 'عدد الشكاوى', field: 'complaintsCount' },
        { header: 'الحالة', field: 'statusText' },
        { header: 'تاريخ الإنشاء', field: 'createdAtFormatted' }
      ],
      data: this.filteredCategories.map((category, index) => ({
        ...category,
        index: index + 1,
        descriptionShort: category.description?.substring(0, 30) + (category.description && category.description.length > 30 ? '...' : ''),
        statusText: category.isDeleted ? 'محذوف' : 'نشط',
        createdAtFormatted: this.formatDate(category.createdAt)
      }))
    });
  }
}
