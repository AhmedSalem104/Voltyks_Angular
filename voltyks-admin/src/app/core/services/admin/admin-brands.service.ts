import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) {}

  // ========== Brands CRUD ==========

  /**
   * Get all brands
   * GET /api/admin/brands
   */
  getBrands(): Observable<ApiResponse<AdminBrandDto[]>> {
    return this.http.get<ApiResponse<AdminBrandDto[]>>(this.baseUrl);
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
    return this.http.post<ApiResponse<AdminBrandDto>>(this.baseUrl, brand);
  }

  /**
   * Update brand
   * PUT /api/admin/brands/{id}
   */
  updateBrand(id: number, brand: UpdateBrandDto): Observable<ApiResponse<AdminBrandDto>> {
    return this.http.put<ApiResponse<AdminBrandDto>>(`${this.baseUrl}/${id}`, brand);
  }

  /**
   * Delete brand
   * DELETE /api/admin/brands/{id}
   */
  deleteBrand(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  // ========== Models CRUD ==========

  /**
   * Get models by brand ID (optional)
   * GET /api/admin/brands/models?brandId={id}
   */
  getModels(brandId?: number): Observable<ApiResponse<AdminModelDto[]>> {
    let params = new HttpParams();
    if (brandId) {
      params = params.set('brandId', brandId.toString());
    }
    return this.http.get<ApiResponse<AdminModelDto[]>>(`${this.baseUrl}/models`, { params });
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
    return this.http.post<ApiResponse<AdminModelDto>>(`${this.baseUrl}/models`, model);
  }

  /**
   * Update model
   * PUT /api/admin/brands/models/{id}
   */
  updateModel(id: number, model: UpdateModelDto): Observable<ApiResponse<AdminModelDto>> {
    return this.http.put<ApiResponse<AdminModelDto>>(`${this.baseUrl}/models/${id}`, model);
  }

  /**
   * Delete model
   * DELETE /api/admin/brands/models/{id}
   */
  deleteModel(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/models/${id}`);
  }
}
