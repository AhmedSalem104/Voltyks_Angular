import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ChargingProtocolService } from '../../core/services/admin/charging-protocol.service';
import { ChargingProtocolDto, CreateChargingProtocolDto, UpdateChargingProtocolDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-charging-protocols',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingOverlayComponent,
    ConfirmDialogComponent
  , TranslatePipe],
  templateUrl: './charging-protocols.component.html',
  styleUrls: ['./charging-protocols.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChargingProtocolsComponent implements OnInit, OnDestroy {
  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  // Protocols data
  protocols: ChargingProtocolDto[] = [];
  filteredProtocols: ChargingProtocolDto[] = [];
  paginatedProtocols: ChargingProtocolDto[] = [];

  // Search
  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // Loading
  isLoading: boolean = false;

  // Modals
  showCreateDialog: boolean = false;
  showEditDialog: boolean = false;
  showDeleteConfirm: boolean = false;

  // Current protocol for edit/delete
  currentProtocol: ChargingProtocolDto | null = null;

  // Form data
  createDto: CreateChargingProtocolDto = {
    name: ''
  };

  updateDto: UpdateChargingProtocolDto = {
    name: ''
  };

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  constructor(
    private protocolService: ChargingProtocolService,
    private toaster: ToasterService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadProtocols();
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

  loadProtocols(): void {
    this.isLoading = true;

    this.protocolService.getAll().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.protocols = response.data;
          this.filteredProtocols = [...this.protocols];
          this.totalItems = this.filteredProtocols.length;
          this.currentPage = 1;
          this.updatePaginatedProtocols();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحميل البروتوكولات');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  private performSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredProtocols = [...this.protocols];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredProtocols = this.protocols.filter(protocol =>
        protocol.name?.toLowerCase().includes(term)
      );
    }

    this.totalItems = this.filteredProtocols.length;
    this.currentPage = 1;
    this.updatePaginatedProtocols();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedProtocols();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaginatedProtocols();
  }

  private updatePaginatedProtocols(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProtocols = this.filteredProtocols.slice(startIndex, endIndex);
    this.cdr.markForCheck();
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

  createProtocol(): void {
    if (!this.validateCreateForm()) {
      return;
    }

    this.isLoading = true;
    this.protocolService.create(this.createDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم إضافة البروتوكول بنجاح');
          this.closeCreateDialog();
          this.loadProtocols();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل إضافة البروتوكول');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openEditDialog(protocol: ChargingProtocolDto): void {
    this.currentProtocol = protocol;
    this.updateDto = {
      name: protocol.name
    };
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.currentProtocol = null;
    this.updateDto = { name: '' };
  }

  updateProtocol(): void {
    if (!this.currentProtocol) return;

    if (!this.updateDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم البروتوكول');
      return;
    }

    this.isLoading = true;
    this.protocolService.update(this.currentProtocol.id, this.updateDto).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم تحديث البروتوكول بنجاح');
          this.closeEditDialog();
          this.loadProtocols();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل تحديث البروتوكول');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openDeleteConfirm(protocol: ChargingProtocolDto): void {
    this.currentProtocol = protocol;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.currentProtocol = null;
  }

  confirmDelete(): void {
    if (!this.currentProtocol) return;

    this.isLoading = true;
    this.protocolService.delete(this.currentProtocol.id).subscribe({
      next: (response) => {
        if (response.status) {
          this.toaster.success('تم حذف البروتوكول بنجاح');
          this.closeDeleteConfirm();
          this.loadProtocols();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.toaster.error(error.message || 'فشل حذف البروتوكول');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private validateCreateForm(): boolean {
    if (!this.createDto.name?.trim()) {
      this.toaster.error('يرجى إدخال اسم البروتوكول');
      return false;
    }
    return true;
  }

  private resetCreateForm(): void {
    this.createDto = {
      name: ''
    };
  }

  printToPdf(): void {
    this.printService.printTableToPdf({
      title: 'تقرير بروتوكولات الشحن',
      filename: 'charging_protocols_report',
      orientation: 'portrait',
      columns: [
        { header: '#', field: 'index' },
        { header: 'اسم البروتوكول', field: 'name' }
      ],
      data: this.filteredProtocols.map((protocol, index) => ({
        ...protocol,
        index: index + 1
      }))
    });
  }
}
