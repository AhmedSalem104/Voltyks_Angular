import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminFeesDto,
  UpdateFeesDto,
  TransferFeesRequestDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminFeesService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.fees}`;

  constructor(private http: HttpClient) {}

  /**
   * Get current fees configuration
   * GET /api/admin/fees
   */
  getFees(): Observable<ApiResponse<AdminFeesDto>> {
    return this.http.get<ApiResponse<AdminFeesDto>>(this.baseUrl);
  }

  /**
   * Update fees configuration
   * PUT /api/admin/fees
   */
  updateFees(dto: UpdateFeesDto): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(this.baseUrl, dto);
  }

  /**
   * Transfer collected fees
   * POST /api/admin/fees/transfer
   */
  transferFees(dto: TransferFeesRequestDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/transfer`, dto);
  }
}
