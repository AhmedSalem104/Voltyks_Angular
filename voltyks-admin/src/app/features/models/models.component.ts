import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminBrandsService } from '../../core/services/admin/admin-brands.service';
import { AdminModelDto, AdminBrandDto, CreateModelDto, UpdateModelDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-models',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './models.component.html',
  styleUrls: ['./models.component.scss']
})
export class ModelsComponent implements OnInit {
  // Models data
  models: AdminModelDto[] = [];
  filteredModels: AdminModelDto[] = [];
  paginatedModels: AdminModelDto[] = [];

  // Brands for dropdown
  brands: AdminBrandDto[] = [];
  selectedBrandFilter: number | null = null;

  // Search
  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;

  // Current model for edit/delete
  currentModel: AdminModelDto | null = null;

  // Form data
  createDto: CreateModelDto = {
    name: '',
    brandId: 0,
    capacity: 0
  };

  updateDto: UpdateModelDto = {
    name: '',
    brandId: 0,
    capacity: 0
  };

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  constructor(
    private brandsService: AdminBrandsService,
    private toaster: ToasterService,
    private route: ActivatedRoute,
    private router: Router,
    private printService: PrintService
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadBrands();

    // Check for brandId in query params
    this.route.queryParams.subscribe(params => {
      if (params['brandId']) {
        this.selectedBrandFilter = +params['brandId'];
      }
      this.loadModels();
    });
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  loadBrands(): void {
    this.brandsService.getBrands().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.brands = response.data;
        }
      },
      error: (error) => {
        console.error('Failed to load brands:', error);
      }
    });
  }

  loadModels(): void {
    this.isLoading = true;

    this.brandsService.getModels(this.selectedBrandFilter || undefined).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.models = response.data;
          this.filteredModels = [...this.models];
          this.totalItems = this.filteredModels.length;
          this.currentPage = 1;
          this.updatePaginatedModels();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل الموديلات');
        this.isLoading = false;
      }
    });
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  private performSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredModels = [...this.models];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredModels = this.models.filter(model =>
        model.name?.toLowerCase().includes(term) ||
        model.brandName?.toLowerCase().includes(term)
      );
    }

    this.totalItems = this.filteredModels.length;
    this.currentPage = 1;
    this.updatePaginatedModels();
  }

  onBrandFilterChange(brandId: number | null): void {
    this.selectedBrandFilter = brandId;
    // Update URL query params
    if (brandId) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { brandId: brandId },
        queryParamsHandling: 'merge'
      });
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { brandId: null },
        queryParamsHandling: 'merge'
      });
    }
    this.loadModels();
  }

  clearBrandFilter(): void {
    this.onBrandFilterChange(null);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedModels();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedModels();
  }

  private updatePaginatedModels(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedModels = this.filteredModels.slice(startIndex, endIndex);
  }

  // CRUD Operations
  openCreateDialog(): void {
    this.resetCreateForm();
    // Pre-select brand if filter is active
    if (this.selectedBrandFilter) {
      this.createDto.brandId = this.selectedBrandFilter;
    }
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.resetCreateForm();
  }

  createModel(): void {
    if (!this.validateCreateForm()) {
      return;
    }

    this.isLoading = true;
    this.brandsService.createModel(this.createDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة الموديل بنجاح');
          this.closeCreateDialog();
          this.loadModels();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة الموديل');
        this.isLoading = false;
      }
    });
  }

  openEditDialog(model: AdminModelDto): void {
    this.currentModel = model;
    this.updateDto = {
      name: model.name,
      brandId: model.brandId,
      capacity: model.capacity
    };
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentModel = null;
    this.updateDto = { name: '', brandId: 0, capacity: 0 };
  }

  updateModel(): void {
    if (!this.currentModel) return;

    if (!this.validateUpdateForm()) {
      return;
    }

    this.isLoading = true;
    this.brandsService.updateModel(this.currentModel.id, this.updateDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم تحديث الموديل بنجاح');
          this.closeEditDialog();
          this.loadModels();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث الموديل');
        this.isLoading = false;
      }
    });
  }

  openDeleteConfirm(model: AdminModelDto): void {
    this.currentModel = model;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentModel = null;
  }

  confirmDelete(): void {
    if (!this.currentModel) return;

    this.isLoading = true;
    this.brandsService.deleteModel(this.currentModel.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف الموديل بنجاح');
          this.closeDeleteConfirm();
          this.loadModels();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف الموديل');
        this.isLoading = false;
      }
    });
  }

  // Navigate back to brands page
  goToBrands(): void {
    this.router.navigate(['/brands']);
  }

  private validateCreateForm(): boolean {
    if (!this.createDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم الموديل');
      return false;
    }
    if (!this.createDto.brandId || this.createDto.brandId === 0) {
      this.toaster.error('يرجى اختيار العلامة التجارية');
      return false;
    }
    if (!this.createDto.capacity || this.createDto.capacity <= 0) {
      this.toaster.error('يرجى إدخال سعة البطارية');
      return false;
    }
    return true;
  }

  private validateUpdateForm(): boolean {
    if (!this.updateDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم الموديل');
      return false;
    }
    if (!this.updateDto.brandId || this.updateDto.brandId === 0) {
      this.toaster.error('يرجى اختيار العلامة التجارية');
      return false;
    }
    if (!this.updateDto.capacity || this.updateDto.capacity <= 0) {
      this.toaster.error('يرجى إدخال سعة البطارية');
      return false;
    }
    return true;
  }

  private resetCreateForm(): void {
    this.createDto = {
      name: '',
      brandId: 0,
      capacity: 0
    };
  }

  getBrandName(brandId: number): string {
    return this.brands.find(b => b.id === brandId)?.name || '-';
  }

  getSelectedBrandName(): string {
    if (!this.selectedBrandFilter) return '';
    return this.brands.find(b => b.id === this.selectedBrandFilter)?.name || '';
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير الموديلات',
      filename: 'models_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'اسم الموديل', field: 'name' },
        { header: 'العلامة التجارية', field: 'brandName' },
        { header: 'سعة البطارية (kWh)', field: 'capacity' }
      ],
      data: this.filteredModels.map((model, index) => ({
        ...model,
        index: index + 1
      }))
    });
  }
}
