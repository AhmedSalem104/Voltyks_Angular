import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminChargerDto,
  AdminCreateChargerDto,
  AdminUpdateChargerDto,
  ProtocolDto,
  CapacityDto,
  PriceOptionDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminChargersService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.chargers}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all chargers with optional userId filter
   * GET /api/admin/chargers?userId=...
   */
  getChargers(userId?: string): Observable<ApiResponse<AdminChargerDto[]>> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.get<ApiResponse<AdminChargerDto[]>>(this.baseUrl, { params });
  }

  /**
   * Get charger by ID
   * GET /api/admin/chargers/{id}
   */
  getChargerById(id: number): Observable<ApiResponse<AdminChargerDto>> {
    return this.http.get<ApiResponse<AdminChargerDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new charger
   * POST /api/admin/chargers
   */
  createCharger(charger: AdminCreateChargerDto): Observable<ApiResponse<AdminChargerDto>> {
    return this.http.post<ApiResponse<AdminChargerDto>>(this.baseUrl, charger);
  }

  /**
   * Update charger
   * PUT /api/admin/chargers/{id}
   */
  updateCharger(id: number, charger: AdminUpdateChargerDto): Observable<ApiResponse<AdminChargerDto>> {
    return this.http.put<ApiResponse<AdminChargerDto>>(`${this.baseUrl}/${id}`, charger);
  }

  /**
   * Delete charger
   * DELETE /api/admin/chargers/{id}
   */
  deleteCharger(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Toggle charger status (active/inactive)
   * PATCH /api/admin/chargers/{id}/status?isActive=...
   */
  toggleStatus(id: number, isActive: boolean): Observable<ApiResponse<void>> {
    const params = new HttpParams().set('isActive', isActive.toString());
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/status`, {}, { params });
  }

  // ========== Lookup Tables ==========

  /**
   * Get all charging protocols
   * GET /api/protocol
   */
  getProtocols(): Observable<ApiResponse<ProtocolDto[]>> {
    return this.http.get<ApiResponse<ProtocolDto[]>>(`${environment.apiBaseUrl}/api/protocol`);
  }

  /**
   * Get all capacities
   * GET /api/admin/capacity
   */
  getCapacities(): Observable<ApiResponse<CapacityDto[]>> {
    return this.http.get<ApiResponse<CapacityDto[]>>(`${environment.apiBaseUrl}/api/admin/capacity`);
  }

  /**
   * Get all price options
   * TODO: Add actual endpoint when available in backend
   */
  getPriceOptions(): Observable<ApiResponse<PriceOptionDto[]>> {
    return this.http.get<ApiResponse<PriceOptionDto[]>>(`${environment.apiBaseUrl}/api/admin/price-options`);
  }
}
