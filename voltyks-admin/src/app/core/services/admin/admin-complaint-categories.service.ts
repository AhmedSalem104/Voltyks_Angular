import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminComplaintCategoryDto,
  CreateComplaintCategoryDto,
  UpdateComplaintCategoryDto,
  ComplaintCategoryFilterParams
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminComplaintCategoriesService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.complaintCategories}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all complaint categories
   * GET /api/admin/complaint-categories
   * Query Params: includeDeleted (optional)
   */
  getCategories(filter?: ComplaintCategoryFilterParams): Observable<ApiResponse<AdminComplaintCategoryDto[]>> {
    let params = new HttpParams();

    if (filter?.includeDeleted !== undefined) {
      params = params.set('includeDeleted', filter.includeDeleted.toString());
    }

    return this.http.get<ApiResponse<AdminComplaintCategoryDto[]>>(this.baseUrl, { params });
  }

  /**
   * Get category by ID
   * GET /api/admin/complaint-categories/{id}
   */
  getCategoryById(id: number): Observable<ApiResponse<AdminComplaintCategoryDto>> {
    return this.http.get<ApiResponse<AdminComplaintCategoryDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new category
   * POST /api/admin/complaint-categories
   */
  createCategory(dto: CreateComplaintCategoryDto): Observable<ApiResponse<AdminComplaintCategoryDto>> {
    return this.http.post<ApiResponse<AdminComplaintCategoryDto>>(this.baseUrl, dto);
  }

  /**
   * Update category
   * PUT /api/admin/complaint-categories/{id}
   */
  updateCategory(id: number, dto: UpdateComplaintCategoryDto): Observable<ApiResponse<AdminComplaintCategoryDto>> {
    return this.http.put<ApiResponse<AdminComplaintCategoryDto>>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Soft delete category
   * DELETE /api/admin/complaint-categories/{id}
   */
  deleteCategory(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.delete<ApiResponse<{ id: number }>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Restore deleted category
   * PATCH /api/admin/complaint-categories/{id}/restore
   */
  restoreCategory(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.patch<ApiResponse<{ id: number }>>(`${this.baseUrl}/${id}/restore`, {});
  }
}
