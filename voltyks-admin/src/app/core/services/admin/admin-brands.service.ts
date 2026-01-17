import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminBrandDto,
  AdminModelDto,
  CreateBrandDto,
  UpdateBrandDto,
  CreateModelDto,
  UpdateModelDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminBrandsService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.brands}`;

  // Cache state
  private brandsCache$ = new BehaviorSubject<AdminBrandDto[] | null>(null);
  private modelsCache$ = new BehaviorSubject<AdminModelDto[] | null>(null);
  private brandsCacheLoading = false;
  private modelsCacheLoading = false;

  constructor(private http: HttpClient) {}

  // ========== Brands CRUD ==========

  /**
   * Get all brands (cached)
   * GET /api/admin/brands
   * @param forceRefresh Force refresh cache
   */
  getBrands(forceRefresh = false): Observable<ApiResponse<AdminBrandDto[]>> {
    // Return cached data if available and not forcing refresh
    const cachedBrands = this.brandsCache$.getValue();
    if (!forceRefresh && cachedBrands && !this.brandsCacheLoading) {
      return of({ status: true, data: cachedBrands, message: 'success' });
    }

    // If already loading, return the HTTP request (will be shared)
    if (this.brandsCacheLoading) {
      return this.http.get<ApiResponse<AdminBrandDto[]>>(this.baseUrl);
    }

    this.brandsCacheLoading = true;
    return this.http.get<ApiResponse<AdminBrandDto[]>>(this.baseUrl).pipe(
      tap(response => {
        if (response.status && response.data) {
          this.brandsCache$.next(response.data);
        }
        this.brandsCacheLoading = false;
      })
    );
  }

  /**
   * Invalidate brands cache
   */
  invalidateBrandsCache(): void {
    this.brandsCache$.next(null);
  }

  /**
   * Get brand by ID
   * GET /api/admin/brands/{id}
   */
  getBrandById(id: number): Observable<ApiResponse<AdminBrandDto>> {
    return this.http.get<ApiResponse<AdminBrandDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new brand
   * POST /api/admin/brands
   */
  createBrand(brand: CreateBrandDto): Observable<ApiResponse<AdminBrandDto>> {
    return this.http.post<ApiResponse<AdminBrandDto>>(this.baseUrl, brand).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateBrandsCache();
        }
      })
    );
  }

  /**
   * Update brand
   * PUT /api/admin/brands/{id}
   */
  updateBrand(id: number, brand: UpdateBrandDto): Observable<ApiResponse<AdminBrandDto>> {
    return this.http.put<ApiResponse<AdminBrandDto>>(`${this.baseUrl}/${id}`, brand).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateBrandsCache();
        }
      })
    );
  }

  /**
   * Delete brand
   * DELETE /api/admin/brands/{id}
   */
  deleteBrand(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateBrandsCache();
        }
      })
    );
  }

  // ========== Models CRUD ==========

  /**
   * Get models by brand ID (optional, cached when no filter)
   * GET /api/admin/brands/models?brandId={id}
   * @param brandId Optional brand ID filter
   * @param forceRefresh Force refresh cache (only when no brandId)
   */
  getModels(brandId?: number, forceRefresh = false): Observable<ApiResponse<AdminModelDto[]>> {
    // Only cache when no brandId filter
    if (!brandId) {
      const cachedModels = this.modelsCache$.getValue();
      if (!forceRefresh && cachedModels && !this.modelsCacheLoading) {
        return of({ status: true, data: cachedModels, message: 'success' });
      }

      if (this.modelsCacheLoading) {
        return this.http.get<ApiResponse<AdminModelDto[]>>(`${this.baseUrl}/models`);
      }

      this.modelsCacheLoading = true;
      return this.http.get<ApiResponse<AdminModelDto[]>>(`${this.baseUrl}/models`).pipe(
        tap(response => {
          if (response.status && response.data) {
            this.modelsCache$.next(response.data);
          }
          this.modelsCacheLoading = false;
        })
      );
    }

    // Filtered request - no caching
    const params = new HttpParams().set('brandId', brandId.toString());
    return this.http.get<ApiResponse<AdminModelDto[]>>(`${this.baseUrl}/models`, { params });
  }

  /**
   * Invalidate models cache
   */
  invalidateModelsCache(): void {
    this.modelsCache$.next(null);
  }

  /**
   * Get model by ID
   * GET /api/admin/brands/models/{id}
   */
  getModelById(id: number): Observable<ApiResponse<AdminModelDto>> {
    return this.http.get<ApiResponse<AdminModelDto>>(`${this.baseUrl}/models/${id}`);
  }

  /**
   * Create new model
   * POST /api/admin/brands/models
   */
  createModel(model: CreateModelDto): Observable<ApiResponse<AdminModelDto>> {
    return this.http.post<ApiResponse<AdminModelDto>>(`${this.baseUrl}/models`, model).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateModelsCache();
          this.invalidateBrandsCache(); // Brand's totalModels count changes
        }
      })
    );
  }

  /**
   * Update model
   * PUT /api/admin/brands/models/{id}
   */
  updateModel(id: number, model: UpdateModelDto): Observable<ApiResponse<AdminModelDto>> {
    return this.http.put<ApiResponse<AdminModelDto>>(`${this.baseUrl}/models/${id}`, model).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateModelsCache();
        }
      })
    );
  }

  /**
   * Delete model
   * DELETE /api/admin/brands/models/{id}
   */
  deleteModel(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/models/${id}`).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateModelsCache();
          this.invalidateBrandsCache(); // Brand's totalModels count changes
        }
      })
    );
  }
}
