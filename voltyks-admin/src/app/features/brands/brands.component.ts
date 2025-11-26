import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminBrandsService } from '../../core/services/admin/admin-brands.service';
import { AdminBrandDto, CreateBrandDto, UpdateBrandDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './brands.component.html',
  styleUrls: ['./brands.component.scss']
})
export class BrandsComponent implements OnInit {
  // Brands data
  brands: AdminBrandDto[] = [];
  filteredBrands: AdminBrandDto[] = [];
  paginatedBrands: AdminBrandDto[] = [];

  // Search
  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;

  // Current brand for edit/delete
  currentBrand: AdminBrandDto | null = null;

  // Form data
  createDto: CreateBrandDto = {
    name: ''
  };

  updateDto: UpdateBrandDto = {
    name: ''
  };

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  constructor(
    private brandsService: AdminBrandsService,
    private toaster: ToasterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadBrands();
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
    this.isLoading = true;

    this.brandsService.getBrands().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.brands = response.data;
          this.filteredBrands = [...this.brands];
          this.totalItems = this.filteredBrands.length;
          this.currentPage = 1;
          this.updatePaginatedBrands();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل العلامات التجارية');
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
      this.filteredBrands = [...this.brands];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredBrands = this.brands.filter(brand =>
        brand.name?.toLowerCase().includes(term)
      );
    }

    this.totalItems = this.filteredBrands.length;
    this.currentPage = 1;
    this.updatePaginatedBrands();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedBrands();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedBrands();
  }

  private updatePaginatedBrands(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedBrands = this.filteredBrands.slice(startIndex, endIndex);
  }

  // CRUD Operations
  openCreateDialog(): void {
    this.resetCreateForm();
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.resetCreateForm();
  }

  createBrand(): void {
    if (!this.validateCreateForm()) {
      return;
    }

    this.isLoading = true;
    this.brandsService.createBrand(this.createDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة العلامة التجارية بنجاح');
          this.closeCreateDialog();
          this.loadBrands();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة العلامة التجارية');
        this.isLoading = false;
      }
    });
  }

  openEditDialog(brand: AdminBrandDto): void {
    this.currentBrand = brand;
    this.updateDto = {
      name: brand.name
    };
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentBrand = null;
    this.updateDto = { name: '' };
  }

  updateBrand(): void {
    if (!this.currentBrand) return;

    if (!this.updateDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم العلامة التجارية');
      return;
    }

    this.isLoading = true;
    this.brandsService.updateBrand(this.currentBrand.id, this.updateDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم تحديث العلامة التجارية بنجاح');
          this.closeEditDialog();
          this.loadBrands();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث العلامة التجارية');
        this.isLoading = false;
      }
    });
  }

  openDeleteConfirm(brand: AdminBrandDto): void {
    this.currentBrand = brand;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentBrand = null;
  }

  confirmDelete(): void {
    if (!this.currentBrand) return;

    this.isLoading = true;
    this.brandsService.deleteBrand(this.currentBrand.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف العلامة التجارية بنجاح');
          this.closeDeleteConfirm();
          this.loadBrands();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف العلامة التجارية');
        this.isLoading = false;
      }
    });
  }

  // Navigate to Models page filtered by brand
  viewModels(brand: AdminBrandDto): void {
    this.router.navigate(['/models'], { queryParams: { brandId: brand.id } });
  }

  private validateCreateForm(): boolean {
    if (!this.createDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم العلامة التجارية');
      return false;
    }
    return true;
  }

  private resetCreateForm(): void {
    this.createDto = {
      name: ''
    };
  }
}
