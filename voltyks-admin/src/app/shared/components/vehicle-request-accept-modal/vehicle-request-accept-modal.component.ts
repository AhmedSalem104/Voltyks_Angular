import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleAdditionRequestsService } from '../../../core/services/admin/vehicle-addition-requests.service';
import { AdminBrandsService } from '../../../core/services/admin/admin-brands.service';
import {
  VehicleAdditionRequestDto,
  AcceptPreviewDto,
  AcceptVehicleRequestBody,
  AdminBrandDto
} from '../../../core/models';

type BrandMode = 'existing' | 'new';

@Component({
  selector: 'app-vehicle-request-accept-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-request-accept-modal.component.html',
  styleUrls: ['./vehicle-request-accept-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleRequestAcceptModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() request: VehicleAdditionRequestDto | null = null;
  @Input() isSaving = false;

  @Output() confirm = new EventEmitter<AcceptVehicleRequestBody>();
  @Output() cancel = new EventEmitter<void>();

  preview: AcceptPreviewDto | null = null;
  isLoadingPreview = false;
  previewError = false;

  // Brand picker state
  brandMode: BrandMode = 'existing';
  selectedBrandId: number | null = null;
  newBrandName = '';

  // Model / capacity state
  modelName = '';
  capacity: number | null = null;

  // All brands (for dropdown)
  allBrands: AdminBrandDto[] = [];
  isLoadingBrands = false;

  constructor(
    private requestsService: VehicleAdditionRequestsService,
    private brandsService: AdminBrandsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.request) {
      this.loadPreview();
      this.loadBrands();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.resetState();
    }
  }

  private resetState(): void {
    this.preview = null;
    this.isLoadingPreview = false;
    this.previewError = false;
    this.brandMode = 'existing';
    this.selectedBrandId = null;
    this.newBrandName = '';
    this.modelName = '';
    this.capacity = null;
  }

  private loadPreview(): void {
    if (!this.request) return;
    this.isLoadingPreview = true;
    this.previewError = false;
    this.preview = null;
    this.cdr.markForCheck();

    this.requestsService.getAcceptPreview(this.request.id).subscribe({
      next: (res) => {
        if (res?.status && res.data) {
          this.preview = res.data;
          this.applyPreviewDefaults(res.data);
        } else {
          this.previewError = true;
        }
        this.isLoadingPreview = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.previewError = true;
        this.isLoadingPreview = false;
        this.cdr.markForCheck();
      }
    });
  }

  private applyPreviewDefaults(preview: AcceptPreviewDto): void {
    // Brand defaults
    if (preview.exactBrandMatch) {
      this.brandMode = 'existing';
      this.selectedBrandId = preview.exactBrandMatch.id;
      this.newBrandName = '';
    } else if (preview.similarBrands.length > 0) {
      // Offer the best similar brand as preselected existing choice
      this.brandMode = 'existing';
      this.selectedBrandId = preview.similarBrands[0].id;
      this.newBrandName = preview.original.brandName;
    } else {
      this.brandMode = 'new';
      this.selectedBrandId = null;
      this.newBrandName = preview.original.brandName;
    }

    // Model + capacity defaults
    this.modelName = preview.original.modelName;
    this.capacity = preview.capacityParseSuccess ? preview.parsedCapacity : null;
  }

  private loadBrands(): void {
    this.isLoadingBrands = true;
    this.cdr.markForCheck();
    this.brandsService.getBrands().subscribe({
      next: (res) => {
        if (res?.status && Array.isArray(res.data)) {
          this.allBrands = res.data;
        }
        this.isLoadingBrands = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingBrands = false;
        this.cdr.markForCheck();
      }
    });
  }

  onBrandModeChange(mode: BrandMode): void {
    this.brandMode = mode;
    this.cdr.markForCheck();
  }

  get selectedBrandName(): string | null {
    if (this.brandMode === 'existing') {
      const match = this.allBrands.find(b => b.id === this.selectedBrandId);
      return match?.name ?? null;
    }
    return this.newBrandName.trim() || null;
  }

  get isDuplicateModel(): boolean {
    return !!this.preview?.exactModelMatch;
  }

  get canAccept(): boolean {
    if (this.isSaving || this.isLoadingPreview || !this.preview) return false;
    if (this.isDuplicateModel) return false;
    if (this.brandMode === 'existing' && !this.selectedBrandId) return false;
    if (this.brandMode === 'new' && !this.newBrandName.trim()) return false;
    if (!this.modelName.trim()) return false;
    if (this.capacity === null || this.capacity <= 0) return false;
    return true;
  }

  get previewText(): string {
    const brand = this.selectedBrandName;
    const model = this.modelName.trim();
    const cap = this.capacity;
    if (!brand || !model || cap === null) return '';

    const brandPart = this.brandMode === 'existing'
      ? `استخدام العلامة "${brand}"`
      : `إنشاء علامة جديدة "${brand}"`;
    return `عند القبول: ${brandPart} + إنشاء الموديل "${model}" بسعة ${cap} kWh.`;
  }

  onConfirm(): void {
    if (!this.canAccept) return;
    const body: AcceptVehicleRequestBody = {
      useExistingBrandId: this.brandMode === 'existing' ? this.selectedBrandId : null,
      brandName: this.brandMode === 'new' ? (this.newBrandName.trim() || null) : null,
      modelName: this.modelName.trim() || null,
      capacity: this.capacity ?? null
    };
    this.confirm.emit(body);
  }

  onCancel(): void {
    if (this.isSaving) return;
    this.cancel.emit();
  }

  getSimilarityPercent(similarity: number): number {
    return Math.round(similarity * 100);
  }
}
