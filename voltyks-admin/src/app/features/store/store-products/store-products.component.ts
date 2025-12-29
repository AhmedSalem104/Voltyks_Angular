import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminStoreService } from '../../../core/services/admin/admin-store.service';
import {
  AdminStoreProductDto,
  AdminStoreCategoryDto,
  CreateStoreProductDto,
  UpdateStoreProductDto,
  ProductStatus,
  PRODUCT_STATUS_LABELS
} from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../../shared/components/toaster/toaster.service';
import { PrintService } from '../../../core/services/print.service';

interface SpecificationItem {
  key: string;
  value: string;
}

@Component({
  selector: 'app-store-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './store-products.component.html',
  styleUrls: ['./store-products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreProductsComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Data
  products: AdminStoreProductDto[] = [];
  filteredProducts: AdminStoreProductDto[] = [];
  paginatedProducts: AdminStoreProductDto[] = [];
  categories: AdminStoreCategoryDto[] = [];

  // Filters
  searchTerm: string = '';
  statusFilter: ProductStatus | '' = '';
  categoryFilter: number | '' = '';
  showTrashed: boolean = false;
  onlyTrashed: boolean = false;
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;
  isSaving: boolean = false;
  isUploading: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;
  showForceDeleteConfirm: boolean = false;
  showDetailsDialog: boolean = false;
  showImageManager: boolean = false;
  showDeleteImageConfirm: boolean = false;
  showLightbox: boolean = false;

  // Current item
  currentProduct: AdminStoreProductDto | null = null;
  currentImageToDelete: string = '';
  lightboxImageUrl: string = '';

  // Form data
  createDto: CreateStoreProductDto = this.getEmptyCreateDto();
  updateDto: UpdateStoreProductDto = {};

  // Specifications management
  createSpecs: SpecificationItem[] = [];
  updateSpecs: SpecificationItem[] = [];

  // Images management (for edit mode - managed via API)
  productImages: string[] = [];
  selectedFiles: File[] = [];

  // Status options
  statusOptions: { value: ProductStatus; label: string }[] = [
    { value: 'active', label: 'نشط' },
    { value: 'hidden', label: 'مخفي' }
  ];

  // Allowed file types
  readonly allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(
    private storeService: AdminStoreService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadCategories();
    this.loadProducts();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  loadCategories(): void {
    this.storeService.getCategories({ status: 'active' }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.categories = response.data;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        // Silent fail for categories dropdown
      }
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.storeService.getProducts({
      withTrashed: this.showTrashed,
      onlyTrashed: this.onlyTrashed,
      status: this.statusFilter || undefined,
      categoryId: this.categoryFilter || undefined
    }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.products = response.data;
          this.applyFilters();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل المنتجات');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private applyFilters(): void {
    let result = [...this.products];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(prod =>
        prod.name.toLowerCase().includes(term) ||
        prod.slug.toLowerCase().includes(term) ||
        (prod.description && prod.description.toLowerCase().includes(term))
      );
    }

    this.filteredProducts = result;
    this.totalItems = this.filteredProducts.length;
    this.currentPage = 1;
    this.updatePaginatedProducts();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  onStatusFilterChange(): void {
    this.loadProducts();
  }

  onCategoryFilterChange(): void {
    this.loadProducts();
  }

  onTrashedFilterChange(): void {
    if (this.onlyTrashed) {
      this.showTrashed = true;
    }
    this.loadProducts();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedProducts();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedProducts();
  }

  private updatePaginatedProducts(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, startIndex + this.pageSize);
    this.cdr.markForCheck();
  }

  // CRUD Operations

  openCreateDialog(): void {
    this.createDto = this.getEmptyCreateDto();
    this.createSpecs = [];
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.createDto = this.getEmptyCreateDto();
    this.createSpecs = [];
  }

  createProduct(): void {
    if (!this.validateCreateForm()) return;

    // Build specifications object
    const specs: Record<string, string> = {};
    this.createSpecs.forEach(spec => {
      if (spec.key.trim() && spec.value.trim()) {
        specs[spec.key.trim()] = spec.value.trim();
      }
    });

    const dto: CreateStoreProductDto = {
      ...this.createDto,
      specifications: Object.keys(specs).length > 0 ? specs : undefined
    };

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.createProduct(dto).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.toaster.success('تم إضافة المنتج بنجاح');
          this.closeCreateDialog();
          // Open image manager for the new product
          this.currentProduct = response.data;
          this.productImages = response.data.images || [];
          this.showImageManager = true;
          this.loadProducts();
        } else {
          this.toaster.error(response.message || 'فشل إضافة المنتج');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة المنتج');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  openEditDialog(product: AdminStoreProductDto): void {
    this.currentProduct = product;
    this.updateDto = {
      name: product.name,
      slug: product.slug,
      description: product.description || undefined,
      price: product.price,
      status: product.status,
      sortOrder: product.sortOrder,
      categoryId: product.categoryId,
      isReservable: product.isReservable,
      thumbnailUrl: product.thumbnailUrl || undefined
    };

    // Parse specifications
    this.updateSpecs = [];
    if (product.specifications) {
      Object.entries(product.specifications).forEach(([key, value]) => {
        this.updateSpecs.push({ key, value });
      });
    }

    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentProduct = null;
    this.updateDto = {};
    this.updateSpecs = [];
  }

  updateProduct(): void {
    if (!this.currentProduct || !this.validateUpdateForm()) return;

    // Build specifications object
    const specs: Record<string, string> = {};
    this.updateSpecs.forEach(spec => {
      if (spec.key.trim() && spec.value.trim()) {
        specs[spec.key.trim()] = spec.value.trim();
      }
    });

    const dto: UpdateStoreProductDto = {
      ...this.updateDto,
      specifications: Object.keys(specs).length > 0 ? specs : undefined
    };

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.updateProduct(this.currentProduct.id, dto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم تحديث المنتج بنجاح');
          this.closeEditDialog();
          this.loadProducts();
        } else {
          this.toaster.error(response.message || 'فشل تحديث المنتج');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث المنتج');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  openDeleteConfirm(product: AdminStoreProductDto): void {
    this.currentProduct = product;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentProduct = null;
  }

  confirmDelete(): void {
    if (!this.currentProduct) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.deleteProduct(this.currentProduct.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف المنتج بنجاح');
          this.closeDeleteConfirm();
          this.loadProducts();
        } else {
          this.toaster.error(response.message || 'فشل حذف المنتج');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف المنتج');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  restoreProduct(product: AdminStoreProductDto): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.restoreProduct(product.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم استرجاع المنتج بنجاح');
          this.loadProducts();
        } else {
          this.toaster.error(response.message || 'فشل استرجاع المنتج');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل استرجاع المنتج');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  openForceDeleteConfirm(product: AdminStoreProductDto): void {
    this.currentProduct = product;
    this.showForceDeleteConfirm = true;
  }

  closeForceDeleteConfirm(): void {
    this.showForceDeleteConfirm = false;
    this.currentProduct = null;
  }

  confirmForceDelete(): void {
    if (!this.currentProduct) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.storeService.forceDeleteProduct(this.currentProduct.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف المنتج نهائياً');
          this.closeForceDeleteConfirm();
          this.loadProducts();
        } else {
          this.toaster.error(response.message || 'فشل حذف المنتج نهائياً');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف المنتج نهائياً');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Details Dialog
  openDetailsDialog(product: AdminStoreProductDto): void {
    this.currentProduct = product;
    this.showDetailsDialog = true;
  }

  closeDetailsDialog(): void {
    this.showDetailsDialog = false;
    this.currentProduct = null;
  }

  // Specifications Management
  addSpecification(isCreate: boolean): void {
    if (isCreate) {
      this.createSpecs.push({ key: '', value: '' });
    } else {
      this.updateSpecs.push({ key: '', value: '' });
    }
    this.cdr.markForCheck();
  }

  removeSpecification(index: number, isCreate: boolean): void {
    if (isCreate) {
      this.createSpecs.splice(index, 1);
    } else {
      this.updateSpecs.splice(index, 1);
    }
    this.cdr.markForCheck();
  }

  // ==================== Image Management ====================

  openImageManager(product: AdminStoreProductDto): void {
    this.currentProduct = product;
    this.productImages = product.images ? [...product.images] : [];
    this.selectedFiles = [];
    this.showImageManager = true;
  }

  closeImageManager(): void {
    this.showImageManager = false;
    this.currentProduct = null;
    this.productImages = [];
    this.selectedFiles = [];
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (!this.allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: نوع ملف غير مدعوم. الأنواع المسموحة: jpg, png, webp`);
      } else if (file.size > this.maxFileSize) {
        errors.push(`${file.name}: حجم الملف يتجاوز 5MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach(err => this.toaster.error(err));
    }

    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    this.cdr.markForCheck();

    // Reset input
    input.value = '';
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.cdr.markForCheck();
  }

  uploadImages(): void {
    if (!this.currentProduct || this.selectedFiles.length === 0) return;

    this.isUploading = true;
    this.cdr.markForCheck();

    this.storeService.uploadProductImages(this.currentProduct.id, this.selectedFiles).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.toaster.success(`تم رفع ${response.data.uploadedUrls.length} صورة بنجاح`);
          this.productImages = response.data.allImages;
          this.selectedFiles = [];
          this.loadProducts();
        } else {
          this.toaster.error(response.message || 'فشل رفع الصور');
        }
        this.isUploading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل رفع الصور');
        this.isUploading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openDeleteImageConfirm(imagePath: string): void {
    this.currentImageToDelete = imagePath;
    this.showDeleteImageConfirm = true;
  }

  closeDeleteImageConfirm(): void {
    this.showDeleteImageConfirm = false;
    this.currentImageToDelete = '';
  }

  confirmDeleteImage(): void {
    if (!this.currentProduct || !this.currentImageToDelete) return;

    this.isUploading = true;
    this.cdr.markForCheck();

    this.storeService.deleteProductImage(this.currentProduct.id, this.currentImageToDelete).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف الصورة بنجاح');
          this.productImages = this.productImages.filter(img => img !== this.currentImageToDelete);
          this.closeDeleteImageConfirm();
          this.loadProducts();
        } else {
          this.toaster.error(response.message || 'فشل حذف الصورة');
        }
        this.isUploading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف الصورة');
        this.isUploading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Lightbox
  openLightbox(imagePath: string): void {
    this.lightboxImageUrl = this.getFullImageUrl(imagePath);
    this.showLightbox = true;
  }

  closeLightbox(): void {
    this.showLightbox = false;
    this.lightboxImageUrl = '';
  }

  // Get full image URL
  getFullImageUrl(imagePath: string): string {
    return this.storeService.getImageUrl(imagePath);
  }

  // Validation
  private validateCreateForm(): boolean {
    if (!this.createDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم المنتج');
      return false;
    }
    if (!this.createDto.categoryId) {
      this.toaster.error('يرجى اختيار الفئة');
      return false;
    }
    if (this.createDto.price === undefined || this.createDto.price < 0) {
      this.toaster.error('يرجى إدخال سعر صحيح');
      return false;
    }
    if (!this.createDto.status) {
      this.toaster.error('يرجى اختيار حالة المنتج');
      return false;
    }
    return true;
  }

  private validateUpdateForm(): boolean {
    if (this.updateDto.name !== undefined && !this.updateDto.name.trim()) {
      this.toaster.error('يرجى إدخال اسم المنتج');
      return false;
    }
    if (this.updateDto.price !== undefined && this.updateDto.price < 0) {
      this.toaster.error('يرجى إدخال سعر صحيح');
      return false;
    }
    return true;
  }

  private getEmptyCreateDto(): CreateStoreProductDto {
    return {
      name: '',
      categoryId: 0,
      price: 0,
      status: 'active',
      sortOrder: 0,
      isReservable: true
    };
  }

  // Helpers
  getStatusLabel(status: ProductStatus): string {
    return PRODUCT_STATUS_LABELS[status] || status;
  }

  getStatusClass(status: ProductStatus): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'hidden': return 'status-hidden';
      default: return '';
    }
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : '-';
  }

  formatPrice(price: number): string {
    return price.toLocaleString('en-US') + ' ج.م';
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

  getSpecsCount(specs: Record<string, string> | null): number {
    if (!specs) return 0;
    return Object.keys(specs).length;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير منتجات المتجر',
      filename: 'store_products_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'الاسم', field: 'name' },
        { header: 'الفئة', field: 'categoryName' },
        { header: 'السعر', field: 'priceFormatted' },
        { header: 'الحالة', field: 'statusLabel' },
        { header: 'قابل للحجز', field: 'reservableLabel' },
        { header: 'عدد الحجوزات', field: 'reservationCount' }
      ],
      data: this.filteredProducts.map((prod, index) => ({
        ...prod,
        index: index + 1,
        categoryName: this.getCategoryName(prod.categoryId),
        priceFormatted: this.formatPrice(prod.price),
        statusLabel: this.getStatusLabel(prod.status),
        reservableLabel: prod.isReservable ? 'نعم' : 'لا'
      }))
    });
  }
}
