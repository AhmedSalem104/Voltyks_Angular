import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminVehicleDto,
  AdminCreateVehicleDto,
  AdminUpdateVehicleDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminVehiclesService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.vehicles}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all vehicles with optional filters
   * GET /api/admin/vehicles?userId=...&brandId=...
   */
  getVehicles(userId?: string, brandId?: string): Observable<ApiResponse<AdminVehicleDto[]>> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    if (brandId) {
      params = params.set('brandId', brandId);
    }
    return this.http.get<ApiResponse<AdminVehicleDto[]>>(this.baseUrl, { params });
  }

  /**
   * Get vehicle by ID
   * GET /api/admin/vehicles/{id}
   */
  getVehicleById(id: number): Observable<ApiResponse<AdminVehicleDto>> {
    return this.http.get<ApiResponse<AdminVehicleDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new vehicle
   * POST /api/admin/vehicles
   */
  createVehicle(vehicle: AdminCreateVehicleDto): Observable<ApiResponse<AdminVehicleDto>> {
    return this.http.post<ApiResponse<AdminVehicleDto>>(this.baseUrl, vehicle);
  }

  /**
   * Update vehicle
   * PUT /api/admin/vehicles/{id}
   */
  updateVehicle(id: number, vehicle: AdminUpdateVehicleDto): Observable<ApiResponse<AdminVehicleDto>> {
    return this.http.put<ApiResponse<AdminVehicleDto>>(`${this.baseUrl}/${id}`, vehicle);
  }

  /**
   * Delete vehicle
   * DELETE /api/admin/vehicles/{id}
   */
  deleteVehicle(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
