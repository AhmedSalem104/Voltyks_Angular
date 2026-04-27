import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AdminBrandsService } from '../../core/services/admin/admin-brands.service';
import { AdminBrandDto, AdminModelDto } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { ToasterService } from '../../shared/components/toaster/toaster.service';

@Component({
  selector: 'app-brands-models',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, LoadingOverlayComponent, TranslatePipe],
  template: `
    <div class="brands-models-container">
      <h2>{{ "brandsModels.pageTitle" | translate }}</h2>
      <p class="subtitle">{{ "brandsModels.pageSubtitle" | translate }}</p>

      <!-- Brands Section -->
      <div class="voltyks-card">
        <h3>{{ "brandsModels.brandsTitle" | translate }}</h3>
        @if (paginatedBrands.length > 0) {
          <table class="voltyks-table">
            <thead>
              <tr>
                <th>{{ "brandsModels.nameCol" | translate }}</th>
                <th>{{ "brandsModels.modelsCountCol" | translate }}</th>
                <th>{{ "brandsModels.actionsCol" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (brand of paginatedBrands; track brand.id) {
                <tr>
                  <td>{{ brand.name }}</td>
                  <td>{{ brand.totalModels || 0 }}</td>
                  <td>
                    <button class="voltyks-btn btn-primary btn-sm" (click)="loadModelsByBrand(brand.id)">
                      {{ "brandsModels.viewModels" | translate }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination
            [totalItems]="brands.length"
            [pageSize]="brandsPageSize"
            [currentPage]="brandsPage"
            (pageChange)="onBrandsPageChange($event)"
          ></app-pagination>
        }
      </div>

      <!-- Models Section -->
      @if (models.length > 0) {
        <div class="voltyks-card">
          <h3>{{ "brandsModels.modelsTitle" | translate }} {{ selectedBrandId ? ("brandsModels.filteredSuffix" | translate) : '' }}</h3>
          @if (selectedBrandId) {
            <button class="voltyks-btn btn-secondary btn-sm mb-md" (click)="clearFilter()">
              {{ "brandsModels.clearFilter" | translate }}
            </button>
          }
          <table class="voltyks-table">
            <thead>
              <tr>
                <th>{{ "brandsModels.nameCol" | translate }}</th>
                <th>{{ "brandsModels.brandCol" | translate }}</th>
                <th>{{ "brandsModels.capacityCol" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (model of paginatedModels; track model.id) {
                <tr>
                  <td>{{ model.name }}</td>
                  <td>{{ model.brandName }}</td>
                  <td>{{ model.capacity }} kWh</td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination
            [totalItems]="models.length"
            [pageSize]="modelsPageSize"
            [currentPage]="modelsPage"
            (pageChange)="onModelsPageChange($event)"
          ></app-pagination>
        </div>
      }
    </div>

    @if (isLoading) {
      <app-loading-overlay></app-loading-overlay>
    }
  `,
  styles: [`
    .brands-models-container {
      animation: fadeIn 0.3s ease-out;

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      h2 {
        color: var(--text-primary);
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 8px;
        background: linear-gradient(135deg, var(--text-primary) 0%, #00C853 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: slideDown 0.4s ease-out;
      }

      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .subtitle {
        color: #B0B0B0;
        font-size: 16px;
        margin-bottom: 32px;
        animation: slideDown 0.4s ease-out 0.1s both;
      }

      .voltyks-card {
        margin-bottom: 24px;
        animation: slideUp 0.4s ease-out backwards;

        &:nth-child(2) { animation-delay: 0.1s; }
        &:nth-child(3) { animation-delay: 0.2s; }
      }

      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }

      h3 {
        color: white;
        font-size: 20px;
        margin-bottom: 20px;
        font-weight: 600;
      }

      .btn-sm {
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 200, 83, 0.3);
        }

        &:active { transform: translateY(0); }
      }

      table tbody tr {
        transition: all 0.3s ease;
        animation: tableRowFadeIn 0.3s ease-out backwards;

        @for $i from 1 through 10 {
          &:nth-child(#{$i}) {
            animation-delay: #{$i * 0.05}s;
          }
        }

        @keyframes tableRowFadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        &:hover {
          background-color: rgba(0, 200, 83, 0.05);
          transform: translateX(-4px);
          box-shadow: 4px 0 0 0 #00C853 inset;
        }
      }
    }
  `]
})
export class BrandsModelsComponent implements OnInit {
  brands: AdminBrandDto[] = [];
  models: AdminModelDto[] = [];
  paginatedBrands: AdminBrandDto[] = [];
  paginatedModels: AdminModelDto[] = [];
  selectedBrandId?: number;
  isLoading = false;

  brandsPage = 1;
  brandsPageSize = 10;
  modelsPage = 1;
  modelsPageSize = 10;

  constructor(private brandsService: AdminBrandsService, private toaster: ToasterService) {}

  ngOnInit(): void {
    this.loadBrands();
    this.loadModels();
  }

  loadBrands(): void {
    this.isLoading = true;
    this.brandsService.getBrands().subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.brands = res.data;
          this.updatePaginatedBrands();
        }
        this.isLoading = false;
      },
      error: (err) => { this.toaster.error(err.message); this.isLoading = false; }
    });
  }

  loadModels(brandId?: number): void {
    this.isLoading = true;
    this.brandsService.getModels(brandId).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.models = res.data;
          this.updatePaginatedModels();
        }
        this.isLoading = false;
      },
      error: (err) => { this.toaster.error(err.message); this.isLoading = false; }
    });
  }

  loadModelsByBrand(brandId: number): void {
    this.selectedBrandId = brandId;
    this.loadModels(brandId);
  }

  clearFilter(): void {
    this.selectedBrandId = undefined;
    this.loadModels();
  }

  updatePaginatedBrands(): void {
    const start = (this.brandsPage - 1) * this.brandsPageSize;
    this.paginatedBrands = this.brands.slice(start, start + this.brandsPageSize);
  }

  updatePaginatedModels(): void {
    const start = (this.modelsPage - 1) * this.modelsPageSize;
    this.paginatedModels = this.models.slice(start, start + this.modelsPageSize);
  }

  onBrandsPageChange(page: number): void {
    this.brandsPage = page;
    this.updatePaginatedBrands();
  }

  onModelsPageChange(page: number): void {
    this.modelsPage = page;
    this.updatePaginatedModels();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
