import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminVehiclesService } from '../../core/services/admin/admin-vehicles.service';
import { AdminUsersService } from '../../core/services/admin/admin-users.service';
import { AdminBrandsService } from '../../core/services/admin/admin-brands.service';
import { AdminVehicleDto, AdminCreateVehicleDto, AdminUpdateVehicleDto, AdminUserDto, AdminBrandDto, AdminModelDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehiclesComponent implements OnInit {
  // Vehicles data
  vehicles: AdminVehicleDto[] = [];
  filteredVehicles: AdminVehicleDto[] = [];
  paginatedVehicles: AdminVehicleDto[] = [];

  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  selectedUser: AdminUserDto | null = null;
  userFilterId: string = '';

  brands: AdminBrandDto[] = [];
  filteredBrands: AdminBrandDto[] = [];
  selectedBrand: AdminBrandDto | null = null;
  brandFilterId: string | number = '';

  models: AdminModelDto[] = [];
  filteredModels: AdminModelDto[] = [];

  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // New filters
  filterModel: string = '';
  filterYear: string = '';
  filterColor: string = '';
  filterModelsList: string[] = [];
  filterYearsList: number[] = [];
  filterColorsList: string[] = [];

  isLoading: boolean = false;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;

  // Current vehicle for edit/delete
  currentVehicle: AdminVehicleDto | null = null;

  // Form data
  createDto: AdminCreateVehicleDto = {
    brandId: 0,
    modelId: 0,
    year: new Date().getFullYear(),
    color: '',
    plate: '',
    userId: ''
  };

  updateDto: AdminUpdateVehicleDto = {};

  // Dropdowns
  isUserDropdownOpen: boolean = false;
  isBrandDropdownOpen: boolean = false;
  isModelDropdownOpen: boolean = false;
  isUserFilterDropdownOpen: boolean = false;
  isBrandFilterDropdownOpen: boolean = false;

  userSearchQuery: string = '';
  brandSearchQuery: string = '';
  modelSearchQuery: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  // Helpers
  maxYear: number = new Date().getFullYear() + 1;

  constructor(
    private vehiclesService: AdminVehiclesService,
    private usersService: AdminUsersService,
    private brandsService: AdminBrandsService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadVehicles();
    this.loadUsers();
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

  loadVehicles(userId?: string, brandId?: string): void {
    this.isLoading = true;

    this.vehiclesService.getVehicles(userId, brandId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.vehicles = response.data;
          this.extractFilterOptions();
          this.applyLocalFilters();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل المركبات');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private extractFilterOptions(): void {
    // Extract unique models
    const modelNames = this.vehicles
      .map(v => this.getModelName(v.modelId))
      .filter(name => name && name !== '-');
    this.filterModelsList = [...new Set(modelNames)].sort();

    // Extract unique years
    const years = this.vehicles
      .map(v => v.year)
      .filter(year => year);
    this.filterYearsList = [...new Set(years)].sort((a, b) => b - a);

    // Extract unique colors
    const colors = this.vehicles
      .map(v => v.color)
      .filter(color => color);
    this.filterColorsList = [...new Set(colors)].sort();
  }

  applyLocalFilters(): void {
    let result = [...this.vehicles];

    // Filter by search term
    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(vehicle =>
        vehicle.plate?.toLowerCase().includes(term) ||
        vehicle.color?.toLowerCase().includes(term) ||
        vehicle.year?.toString().includes(term)
      );
    }

    // Filter by model
    if (this.filterModel) {
      result = result.filter(vehicle =>
        this.getModelName(vehicle.modelId) === this.filterModel
      );
    }

    // Filter by year
    if (this.filterYear) {
      result = result.filter(vehicle =>
        vehicle.year?.toString() === this.filterYear
      );
    }

    // Filter by color
    if (this.filterColor) {
      result = result.filter(vehicle =>
        vehicle.color === this.filterColor
      );
    }

    this.filteredVehicles = result;
    this.totalItems = this.filteredVehicles.length;
    this.currentPage = 1;
    this.updatePaginatedVehicles();
  }

  onFilterModelChange(): void {
    this.applyLocalFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.filterModel = '';
    this.filterYear = '';
    this.filterColor = '';
    this.selectedUser = null;
    this.userFilterId = '';
    this.selectedBrand = null;
    this.brandFilterId = '';
    this.loadVehicles();
  }

  loadUsers(): void {
    this.usersService.getUsers().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.users = response.data;
          this.filteredUsers = response.data;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  loadBrands(): void {
    this.brandsService.getBrands().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.brands = response.data;
          this.filteredBrands = response.data;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  loadModels(brandId?: number): void {
    this.brandsService.getModels(brandId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.models = response.data;
          this.filteredModels = response.data;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  private performSearch(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyLocalFilters();
  }

  filterByUser(userId: string): void {
    this.userFilterId = userId;
    this.loadVehicles(userId || undefined, this.brandFilterId ? this.brandFilterId.toString() : undefined);
  }

  filterByBrand(brandId: string): void {
    this.brandFilterId = brandId;
    this.loadVehicles(this.userFilterId || undefined, brandId || undefined);
  }

  clearUserFilter(): void {
    this.userFilterId = '';
    this.selectedUser = null;
    this.loadVehicles(undefined, this.brandFilterId ? this.brandFilterId.toString() : undefined);
  }

  clearBrandFilter(): void {
    this.brandFilterId = '';
    this.selectedBrand = null;
    this.loadVehicles(this.userFilterId || undefined, undefined);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedVehicles();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedVehicles();
  }

  private updatePaginatedVehicles(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedVehicles = this.filteredVehicles.slice(startIndex, endIndex);
  }

  // User dropdown methods
  toggleUserDropdown(isForFilter: boolean = false): void {
    if (isForFilter) {
      this.isUserFilterDropdownOpen = !this.isUserFilterDropdownOpen;
      if (this.isUserFilterDropdownOpen) {
        this.userSearchQuery = '';
        this.filteredUsers = this.users;
      }
    } else {
      this.isUserDropdownOpen = !this.isUserDropdownOpen;
      if (this.isUserDropdownOpen) {
        this.userSearchQuery = '';
        this.filteredUsers = this.users;
      }
    }
  }

  toggleBrandDropdown(isForFilter: boolean = false): void {
    if (isForFilter) {
      this.isBrandFilterDropdownOpen = !this.isBrandFilterDropdownOpen;
      if (this.isBrandFilterDropdownOpen) {
        this.brandSearchQuery = '';
        this.filteredBrands = this.brands;
      }
    } else {
      this.isBrandDropdownOpen = !this.isBrandDropdownOpen;
      if (this.isBrandDropdownOpen) {
        this.brandSearchQuery = '';
        this.filteredBrands = this.brands;
        // Load models when brand dropdown is opened in create/edit
        if (this.createDto.brandId) {
          const brand = this.brands.find(b => b.id === this.createDto.brandId);
          if (brand) this.loadModels(brand.id);
        }
      }
    }
  }

  toggleModelDropdown(): void {
    this.isModelDropdownOpen = !this.isModelDropdownOpen;
    if (this.isModelDropdownOpen) {
      this.modelSearchQuery = '';
      this.filteredModels = this.models;
    }
  }

  filterUsersDropdown(): void {
    const query = this.userSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user =>
        user.fullName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phoneNumber?.includes(query)
      );
    }
  }

  filterBrandsDropdown(): void {
    const query = this.brandSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredBrands = this.brands;
    } else {
      this.filteredBrands = this.brands.filter(brand =>
        brand.name?.toLowerCase().includes(query)
      );
    }
  }

  filterModelsDropdown(): void {
    const query = this.modelSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredModels = this.models;
    } else {
      this.filteredModels = this.models.filter(model =>
        model.name?.toLowerCase().includes(query)
      );
    }
  }

  selectUser(user: AdminUserDto, isForFilter: boolean = false): void {
    if (isForFilter) {
      this.selectedUser = user;
      this.userFilterId = user.id;
      this.isUserFilterDropdownOpen = false;
      this.filterByUser(user.id);
    } else {
      this.createDto.userId = user.id;
      this.isUserDropdownOpen = false;
    }
  }

  selectBrand(brand: AdminBrandDto, isForFilter: boolean = false): void {
    if (isForFilter) {
      this.selectedBrand = brand;
      this.brandFilterId = brand.id;
      this.isBrandFilterDropdownOpen = false;
      this.filterByBrand(brand.id.toString());
    } else {
      this.createDto.brandId = brand.id;
      this.createDto.modelId = 0; // Reset model when brand changes
      this.isBrandDropdownOpen = false;
      this.loadModels(brand.id); // Load models for selected brand
    }
  }

  selectModel(model: AdminModelDto): void {
    this.createDto.modelId = model.id;
    this.isModelDropdownOpen = false;
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

  createVehicle(): void {
    if (!this.validateCreateForm()) {
      return;
    }

    this.isLoading = true;
    this.vehiclesService.createVehicle(this.createDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة المركبة بنجاح');
          this.closeCreateDialog();
          this.loadVehicles(this.userFilterId || undefined, this.brandFilterId ? this.brandFilterId.toString() : undefined);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة المركبة');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openEditDialog(vehicle: AdminVehicleDto): void {
    this.currentVehicle = vehicle;
    this.updateDto = {
      brandId: vehicle.brandId,
      modelId: vehicle.modelId,
      year: vehicle.year,
      color: vehicle.color,
      plate: vehicle.plate
    };
    this.showEditDialog = true;

    // Load models for the current brand
    const brand = this.brands.find(b => b.id === vehicle.brandId);
    if (brand) {
      this.loadModels(brand.id);
    }
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentVehicle = null;
    this.updateDto = {};
  }

  updateVehicle(): void {
    if (!this.currentVehicle) return;

    this.isLoading = true;
    this.vehiclesService.updateVehicle(this.currentVehicle.id, this.updateDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم تحديث المركبة بنجاح');
          this.closeEditDialog();
          this.loadVehicles(this.userFilterId || undefined, this.brandFilterId ? this.brandFilterId.toString() : undefined);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث المركبة');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openDeleteConfirm(vehicle: AdminVehicleDto): void {
    this.currentVehicle = vehicle;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentVehicle = null;
  }

  confirmDelete(): void {
    if (!this.currentVehicle) return;

    this.isLoading = true;
    this.vehiclesService.deleteVehicle(this.currentVehicle.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف المركبة بنجاح');
          this.closeDeleteConfirm();
          this.loadVehicles(this.userFilterId || undefined, this.brandFilterId ? this.brandFilterId.toString() : undefined);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف المركبة');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private validateCreateForm(): boolean {
    if (!this.createDto.brandId || this.createDto.brandId === 0) {
      this.toaster.error('يرجى اختيار العلامة التجارية');
      return false;
    }
    if (!this.createDto.modelId || this.createDto.modelId === 0) {
      this.toaster.error('يرجى اختيار الموديل');
      return false;
    }
    if (!this.createDto.year || this.createDto.year < 1900 || this.createDto.year > new Date().getFullYear() + 1) {
      this.toaster.error('يرجى إدخال سنة الصنع الصحيحة');
      return false;
    }
    if (!this.createDto.color?.trim()) {
      this.toaster.error('يرجى إدخال اللون');
      return false;
    }
    if (!this.createDto.plate?.trim()) {
      this.toaster.error('يرجى إدخال رقم اللوحة');
      return false;
    }
    if (!this.createDto.userId?.trim()) {
      this.toaster.error('يرجى اختيار المستخدم');
      return false;
    }
    return true;
  }

  private resetCreateForm(): void {
    this.createDto = {
      brandId: 0,
      modelId: 0,
      year: new Date().getFullYear(),
      color: '',
      plate: '',
      userId: ''
    };
    this.models = [];
    this.filteredModels = [];
  }

  getBrandName(brandId: number): string {
    return this.brands.find(b => b.id === brandId)?.name || '-';
  }

  getModelName(modelId: number): string {
    return this.models.find(m => m.id === modelId)?.name || '-';
  }

  getUserName(userId: string): string {
    return this.users.find(u => u.id === userId)?.fullName || 'مستخدم محدد';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير المركبات',
      filename: 'vehicles_report',
      orientation: 'landscape',
      columns: [
        { header: 'المالك', field: 'userName' },
        { header: 'البريد', field: 'userEmail' },
        { header: 'الهاتف', field: 'userPhone' },
        { header: 'العلامة التجارية', field: 'brandName' },
        { header: 'الموديل', field: 'modelName' },
        { header: 'السعة', field: 'capacityText' },
        { header: 'السنة', field: 'year' },
        { header: 'اللون', field: 'color' },
        { header: 'اللوحة', field: 'plate' }
      ],
      data: this.filteredVehicles.map(vehicle => ({
        ...vehicle,
        brandName: this.getBrandName(vehicle.brandId),
        modelName: this.getModelName(vehicle.modelId),
        capacityText: vehicle.modelCapacity ? `${vehicle.modelCapacity} kWh` : '-'
      }))
    });
  }
}
