import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CapacityService } from '../../core/services/admin/capacity.service';
import { CapacityDto, CreateCapacityDto, UpdateCapacityDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-capacities',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  , TranslatePipe],
  templateUrl: './capacities.component.html',
  styleUrls: ['./capacities.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CapacitiesComponent implements OnInit, OnDestroy {
  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  // Data
  capacities: CapacityDto[] = [];
  filteredCapacities: CapacityDto[] = [];
  paginatedCapacities: CapacityDto[] = [];

  // Search
  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;

  // Current capacity for edit/delete
  currentCapacity: CapacityDto | null = null;

  // Form data
  createDto: CreateCapacityDto = { kw: 0 };
  updateDto: UpdateCapacityDto = { kw: 0 };

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  constructor(
    private capacityService: CapacityService,
    private toaster: ToasterService,
    private printService: PrintService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadCapacities();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCapacities(): void {
    this.isLoading = true;

    this.capacityService.getAll().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.capacities = response.data;
          this.filteredCapacities = [...this.capacities];
          this.totalItems = this.filteredCapacities.length;
          this.currentPage = 1;
          this.updatePaginatedCapacities();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || this.t('capacities.msg.loadFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  private performSearch(term: string): void {
    if (!term.trim()) {
      this.filteredCapacities = [...this.capacities];
    } else {
      const searchLower = term.toLowerCase();
      this.filteredCapacities = this.capacities.filter(capacity =>
        capacity.kw.toString().includes(searchLower)
      );
    }
    this.totalItems = this.filteredCapacities.length;
    this.currentPage = 1;
    this.updatePaginatedCapacities();
  }

  updatePaginatedCapacities(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedCapacities = this.filteredCapacities.slice(start, end);
    this.cdr.markForCheck();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedCapacities();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedCapacities();
  }

  // Create
  openCreateDialog(): void {
    this.createDto = { kw: 0 };
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
  }

  createCapacity(): void {
    if (!this.createDto.kw || this.createDto.kw <= 0) {
      this.toaster.error(this.t('capacities.msg.enterValid'));
      return;
    }

    this.isLoading = true;
    this.capacityService.create(this.createDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.t('capacities.msg.addSuccess'));
          this.closeCreateDialog();
          this.loadCapacities();
        } else {
          this.toaster.error(response.message || this.t('capacities.msg.addFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || this.t('capacities.msg.addFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Edit
  openEditDialog(capacity: CapacityDto): void {
    this.currentCapacity = capacity;
    this.updateDto = { kw: capacity.kw };
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentCapacity = null;
  }

  updateCapacity(): void {
    if (!this.currentCapacity) return;

    if (!this.updateDto.kw || this.updateDto.kw <= 0) {
      this.toaster.error(this.t('capacities.msg.enterValid'));
      return;
    }

    this.isLoading = true;
    this.capacityService.update(this.currentCapacity.id, this.updateDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.t('capacities.msg.updateSuccess'));
          this.closeEditDialog();
          this.loadCapacities();
        } else {
          this.toaster.error(response.message || this.t('capacities.msg.updateFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || this.t('capacities.msg.updateFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Delete
  openDeleteConfirm(capacity: CapacityDto): void {
    this.currentCapacity = capacity;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentCapacity = null;
  }

  confirmDelete(): void {
    if (!this.currentCapacity) return;

    this.isLoading = true;
    this.capacityService.delete(this.currentCapacity.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success(this.t('capacities.msg.deleteSuccess'));
          this.closeDeleteConfirm();
          this.loadCapacities();
        } else {
          this.toaster.error(response.message || this.t('capacities.msg.deleteFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || this.t('capacities.msg.deleteFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Print
  printToPdf(): void {
    this.printService.printTableToPdf({
      title: this.t('capacities.printTitle'),
      filename: 'capacities_report',
      orientation: 'portrait',
      columns: [
        { header: '#', field: 'index' },
        { header: this.t('capacities.printColumnKw'), field: 'kwFormatted' }
      ],
      data: this.filteredCapacities.map((capacity, index) => ({
        ...capacity,
        index: index + 1,
        kwFormatted: `${capacity.kw} kW`
      }))
    });
  }
}
