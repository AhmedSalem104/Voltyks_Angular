import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminChargersService } from '../../core/services/admin/admin-chargers.service';
import { AdminUsersService } from '../../core/services/admin/admin-users.service';
import { AdminChargerDto, AdminCreateChargerDto, AdminUpdateChargerDto, AdminUserDto, ProtocolDto, CapacityDto, PriceOptionDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-chargers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './chargers.component.html',
  styleUrls: ['./chargers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChargersComponent implements OnInit {
  // Chargers data
  chargers: AdminChargerDto[] = [];
  filteredChargers: AdminChargerDto[] = [];
  paginatedChargers: AdminChargerDto[] = [];

  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  selectedUser: AdminUserDto | null = null;
  userFilterId: string = '';

  protocols: ProtocolDto[] = [];
  capacities: CapacityDto[] = [];
  priceOptions: PriceOptionDto[] = [];

  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  isLoading: boolean = false;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;

  // Current charger for edit/delete
  currentCharger: AdminChargerDto | null = null;

  // Form data
  createDto: AdminCreateChargerDto = {
    userId: '',
    protocolId: 0,
    capacityId: 0,
    priceOptionId: 0,
    area: '',
    street: '',
    buildingNumber: '',
    latitude: 0,
    longitude: 0,
    isActive: true
  };

  updateDto: AdminUpdateChargerDto = {};

  // User dropdown - Filter
  isFilterDropdownOpen: boolean = false;
  filterSearchQuery: string = '';

  // User dropdown - Create Form
  isCreateUserDropdownOpen: boolean = false;
  createUserSearchQuery: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  constructor(
    private chargersService: AdminChargersService,
    private usersService: AdminUsersService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadChargers();
    this.loadUsers();
    // Note: protocols, capacities, price-options are loaded on-demand when opening create/edit dialogs
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  loadChargers(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.chargersService.getChargers().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.chargers = response.data;
          this.applyFilters();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل الشواحن');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private applyFilters(): void {
    let result = [...this.chargers];

    // Filter by user if selected
    if (this.userFilterId) {
      result = result.filter(charger => charger.userId === this.userFilterId);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(charger =>
        charger.protocolName?.toLowerCase().includes(term) ||
        charger.area?.toLowerCase().includes(term) ||
        charger.street?.toLowerCase().includes(term) ||
        charger.userName?.toLowerCase().includes(term)
      );
    }

    this.filteredChargers = result;
    this.totalItems = this.filteredChargers.length;
    this.currentPage = 1;
    this.updatePaginatedChargers();
  }

  loadUsers(): void {
    this.usersService.getUsers().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.users = response.data;
          this.filteredUsers = response.data;
        }
      },
      error: () => {}
    });
  }

  loadProtocols(): void {
    this.chargersService.getProtocols().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.protocols = response.data;
        }
      },
      error: () => {}
    });
  }

  loadCapacities(): void {
    this.chargersService.getCapacities().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.capacities = response.data;
        }
      },
      error: () => {}
    });
  }

  loadPriceOptions(): void {
    this.chargersService.getPriceOptions().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.priceOptions = response.data;
        }
      },
      error: () => {}
    });
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  private performSearch(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyFilters();
  }

  filterByUser(userId: string): void {
    this.userFilterId = userId;
    this.applyFilters();
  }

  clearUserFilter(): void {
    this.userFilterId = '';
    this.selectedUser = null;
    this.isFilterDropdownOpen = false;
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedChargers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedChargers();
  }

  private updatePaginatedChargers(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedChargers = this.filteredChargers.slice(startIndex, endIndex);
  }

  // User dropdown methods - Filter
  toggleFilterDropdown(): void {
    this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
    if (this.isFilterDropdownOpen) {
      this.filterSearchQuery = '';
      this.filteredUsers = this.users;
    }
  }

  filterUsersInFilterDropdown(): void {
    const query = this.filterSearchQuery.toLowerCase().trim();
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

  selectUserForFilter(user: AdminUserDto): void {
    this.selectedUser = user;
    this.userFilterId = user.id;
    this.isFilterDropdownOpen = false;
    this.filterByUser(user.id);
  }

  // User dropdown methods - Create Form
  toggleCreateUserDropdown(): void {
    this.isCreateUserDropdownOpen = !this.isCreateUserDropdownOpen;
    if (this.isCreateUserDropdownOpen) {
      this.createUserSearchQuery = '';
      this.filteredUsers = this.users;
    }
  }

  filterUsersInCreateDropdown(): void {
    const query = this.createUserSearchQuery.toLowerCase().trim();
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

  selectUserForCreate(user: AdminUserDto): void {
    this.createDto.userId = user.id;
    this.isCreateUserDropdownOpen = false;
  }

  // CRUD Operations
  openCreateDialog(): void {
    this.loadDropdownData();
    this.resetCreateForm();
    this.showCreateDialog = true;
  }

  private loadDropdownData(): void {
    // Load data only if not already loaded
    if (this.protocols.length === 0) {
      this.loadProtocols();
    }
    if (this.capacities.length === 0) {
      this.loadCapacities();
    }
    if (this.priceOptions.length === 0) {
      this.loadPriceOptions();
    }
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.resetCreateForm();
  }

  createCharger(): void {
    if (!this.validateCreateForm()) {
      return;
    }

    this.isLoading = true;
    this.chargersService.createCharger(this.createDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة الشاحن بنجاح');
          this.closeCreateDialog();
          this.loadChargers();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة الشاحن');
        this.isLoading = false;
      }
    });
  }

  openEditDialog(charger: AdminChargerDto): void {
    this.loadDropdownData();
    this.currentCharger = charger;
    this.updateDto = {
      userId: charger.userId,
      protocolId: charger.protocolId,
      capacityId: charger.capacityId,
      priceOptionId: charger.priceOptionId,
      area: charger.area,
      street: charger.street,
      buildingNumber: charger.buildingNumber,
      latitude: charger.latitude,
      longitude: charger.longitude,
      isActive: charger.isActive
    };
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentCharger = null;
    this.updateDto = {};
  }

  updateCharger(): void {
    if (!this.currentCharger) return;

    this.isLoading = true;
    this.chargersService.updateCharger(this.currentCharger.id, this.updateDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم تحديث الشاحن بنجاح');
          this.closeEditDialog();
          this.loadChargers();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث الشاحن');
        this.isLoading = false;
      }
    });
  }

  openDeleteConfirm(charger: AdminChargerDto): void {
    this.currentCharger = charger;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentCharger = null;
  }

  confirmDelete(): void {
    if (!this.currentCharger) return;

    this.isLoading = true;
    this.chargersService.deleteCharger(this.currentCharger.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف الشاحن بنجاح');
          this.closeDeleteConfirm();
          this.loadChargers();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف الشاحن');
        this.isLoading = false;
      }
    });
  }

  toggleStatus(charger: AdminChargerDto): void {
    const newStatus = !charger.isActive;

    this.chargersService.toggleStatus(charger.id, newStatus).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(`تم ${newStatus ? 'تفعيل' : 'إيقاف'} الشاحن بنجاح`);
          this.loadChargers();
        }
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث حالة الشاحن');
      }
    });
  }

  private validateCreateForm(): boolean {
    if (!this.createDto.userId?.trim()) {
      this.toaster.error('يرجى اختيار المستخدم');
      return false;
    }
    if (!this.createDto.protocolId || this.createDto.protocolId === 0) {
      this.toaster.error('يرجى اختيار البروتوكول');
      return false;
    }
    if (!this.createDto.capacityId || this.createDto.capacityId === 0) {
      this.toaster.error('يرجى اختيار السعة');
      return false;
    }
    if (!this.createDto.priceOptionId || this.createDto.priceOptionId === 0) {
      this.toaster.error('يرجى اختيار خيار السعر');
      return false;
    }
    if (!this.createDto.area?.trim()) {
      this.toaster.error('يرجى إدخال المنطقة');
      return false;
    }
    if (!this.createDto.street?.trim()) {
      this.toaster.error('يرجى إدخال الشارع');
      return false;
    }
    if (!this.createDto.buildingNumber?.trim()) {
      this.toaster.error('يرجى إدخال رقم المبنى');
      return false;
    }
    return true;
  }

  private resetCreateForm(): void {
    this.createDto = {
      userId: '',
      protocolId: 0,
      capacityId: 0,
      priceOptionId: 0,
      area: '',
      street: '',
      buildingNumber: '',
      latitude: 0,
      longitude: 0,
      isActive: true
    };
  }

  getStatusClass(charger: AdminChargerDto): string {
    return charger.isActive ? 'status-active' : 'status-banned';
  }

  getStatusText(charger: AdminChargerDto): string {
    return charger.isActive ? 'نشط' : 'متوقف';
  }

  getUserName(userId: string): string {
    return this.users.find(u => u.id === userId)?.fullName || 'مستخدم محدد';
  }

  getProtocolName(protocolId: number): string {
    return this.protocols.find(p => p.id === protocolId)?.name || '-';
  }

  getCapacityKw(capacityId: number): string {
    const capacity = this.capacities.find(c => c.id === capacityId);
    return capacity ? `${capacity.kw} kW` : '-';
  }

  getPriceValue(priceOptionId: number): string {
    const price = this.priceOptions.find(p => p.id === priceOptionId);
    return price ? `${price.value} ج.م` : '-';
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

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.custom-dropdown');
    if (!dropdown && this.isFilterDropdownOpen) {
      this.isFilterDropdownOpen = false;
    }
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير الشواحن',
      filename: 'chargers_report',
      orientation: 'landscape',
      columns: [
        { header: '#', field: 'index' },
        { header: 'المستخدم', field: 'userName' },
        { header: 'البروتوكول', field: 'protocolName' },
        { header: 'المنطقة', field: 'area' },
        { header: 'الشارع', field: 'street' },
        { header: 'الحالة', field: 'statusText' }
      ],
      data: this.filteredChargers.map((charger, index) => ({
        ...charger,
        index: index + 1,
        statusText: charger.isActive ? 'نشط' : 'متوقف'
      }))
    });
  }
}
