import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminStoreService } from '../../../core/services/admin/admin-store.service';
import {
  AdminStoreCategoryDto,
  CreateStoreCategoryDto,
  UpdateStoreCategoryDto,
  CategoryStatus,
  CATEGORY_STATUS_LABELS
} from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { PrintService } from '../../../core/services/print.service';

@Component({
  selector: 'app-store-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  , TranslatePipe],
  templateUrl: './store-categories.component.html',
  styleUrls: ['./store-categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreCategoriesComponent implements OnInit, OnDestroy {
  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  // Data
  categories: AdminStoreCategoryDto[] = [];
  filteredCategories: AdminStoreCategoryDto[] = [];
  paginatedCategories: AdminStoreCategoryDto[] = [];

  // Filters
  searchTerm: string = '';
  statusFilter: CategoryStatus | '' = '';
  showTrashed: boolean = false;
  onlyTrashed: boolean = false;
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;
  isSaving: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;
  showForceDeleteConfirm: boolean = false;

  // Current item
  currentCategory: AdminStoreCategoryDto | null = null;

  // Form data
  createDto: CreateStoreCategoryDto = this.getEmptyCreateDto();
  updateDto: UpdateStoreCategoryDto = {};

  // Status options
  statusOptions: { value: CategoryStatus; label: string }[] = [
    { value: 'active', label: 'نشط' },
    { value: 'coming_soon', label: 'قريباً' },
    { value: 'hidden', label: 'مخفي' }
  ];

  constructor(
    private storeService: AdminStoreService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadCategories();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.storeService.getCategories({
      withTrashed: this.showTrashed,
      onlyTrashed: this.onlyTrashed,
      status: this.statusFilter || undefined
    }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.categories = response.data;
          this.applyFilters();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل الفئات');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private applyFilters(): void {
    let result = [...this.categories];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(cat =>
        cat.name.toLowerCase().includes(term) ||
        cat.slug.toLowerCase().includes(term)
      );
    }

    this.filteredCategories = result;
    this.totalItems = this.filteredCategories.length;
    this.currentPage = 1;
    this.updatePaginatedCategories();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  onStatusFilterChange(): void {
    this.loadCategories();
  }

  onTrashedFilterChange(): void {
    if (this.onlyTrashed) {
      this.showTrashed = true;
    }
    this.loadCategories();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedCategories();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedCategories();
  }

  private updatePaginatedCategories(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedCategories = this.filteredCategories.slice(startIndex, startIndex + this.pageSize);
    this.cdr.markForCheck();
  }

  // CRUD Operations

  openCreateDialog(): void {
    this.createDto = this.getEmptyCreateDto();
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.createDto = this.getEmptyCreateDto();
  }

  createCategory(): void {
    if (!this.validateCreateForm()) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.createCategory(this.createDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة الفئة بنجاح');
          this.closeCreateDialog();
          this.loadCategories();
        } else {
          this.toaster.error(response.message || 'فشل إضافة الفئة');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة الفئة');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  openEditDialog(category: AdminStoreCategoryDto): void {
    this.currentCategory = category;
    this.updateDto = {
      name: category.name,
      slug: category.slug,
      status: category.status,
      sortOrder: category.sortOrder,
      icon: category.icon || undefined,
      placeholderMessage: category.placeholderMessage || undefined
    };
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentCategory = null;
    this.updateDto = {};
  }

  updateCategory(): void {
    if (!this.currentCategory || !this.validateUpdateForm()) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.updateCategory(this.currentCategory.id, this.updateDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم تحديث الفئة بنجاح');
          this.closeEditDialog();
          this.loadCategories();
        } else {
          this.toaster.error(response.message || 'فشل تحديث الفئة');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث الفئة');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  openDeleteConfirm(category: AdminStoreCategoryDto): void {
    this.currentCategory = category;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentCategory = null;
  }

  confirmDelete(): void {
    if (!this.currentCategory) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.deleteCategory(this.currentCategory.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف الفئة بنجاح');
          this.closeDeleteConfirm();
          this.loadCategories();
        } else {
          this.toaster.error(response.message || 'فشل حذف الفئة');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف الفئة');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  restoreCategory(category: AdminStoreCategoryDto): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.restoreCategory(category.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم استرجاع الفئة بنجاح');
          this.loadCategories();
        } else {
          this.toaster.error(response.message || 'فشل استرجاع الفئة');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل استرجاع الفئة');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  openForceDeleteConfirm(category: AdminStoreCategoryDto): void {
    this.currentCategory = category;
    this.showForceDeleteConfirm = true;
  }

  closeForceDeleteConfirm(): void {
    this.showForceDeleteConfirm = false;
    this.currentCategory = null;
  }

  confirmForceDelete(): void {
    if (!this.currentCategory) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.forceDeleteCategory(this.currentCategory.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف الفئة نهائياً');
          this.closeForceDeleteConfirm();
          this.loadCategories();
        } else {
          this.toaster.error(response.message || 'فشل حذف الفئة نهائياً');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف الفئة نهائياً');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Validation
  private validateCreateForm(): boolean {
    if (!this.createDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم الفئة');
      return false;
    }
    if (!this.createDto.status) {
      this.toaster.error('يرجى اختيار حالة الفئة');
      return false;
    }
    if (this.createDto.sortOrder === undefined || this.createDto.sortOrder < 0) {
      this.toaster.error('يرجى إدخال ترتيب صحيح');
      return false;
    }
    return true;
  }

  private validateUpdateForm(): boolean {
    if (this.updateDto.name !== undefined && !this.updateDto.name.trim()) {
      this.toaster.error('يرجى إدخال اسم الفئة');
      return false;
    }
    return true;
  }

  private getEmptyCreateDto(): CreateStoreCategoryDto {
    return {
      name: '',
      status: 'active',
      sortOrder: 0
    };
  }

  // Helpers
  getStatusLabel(status: CategoryStatus): string {
    return CATEGORY_STATUS_LABELS[status] || status;
  }

  getStatusClass(status: CategoryStatus): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'coming_soon': return 'status-coming-soon';
      case 'hidden': return 'status-hidden';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير فئات المتجر',
      filename: 'store_categories_report',
      orientation: 'portrait',
      columns: [
        { header: '#', field: 'index' },
        { header: 'الاسم', field: 'name' },
        { header: 'الحالة', field: 'statusLabel' },
        { header: 'عدد المنتجات', field: 'productCount' },
        { header: 'الترتيب', field: 'sortOrder' }
      ],
      data: this.filteredCategories.map((cat, index) => ({
        ...cat,
        index: index + 1,
        statusLabel: this.getStatusLabel(cat.status)
      }))
    });
  }
}
