import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  ChargingProtocolDto,
  CreateChargingProtocolDto,
  UpdateChargingProtocolDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class ChargingProtocolService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/protocol`;

  constructor(private http: HttpClient) {}

  /**
   * Get all charging protocols
   * GET /api/protocol
   */
  getAll(): Observable<ApiResponse<ChargingProtocolDto[]>> {
    return this.http.get<ApiResponse<ChargingProtocolDto[]>>(this.baseUrl);
  }

  /**
   * Get charging protocol by ID
   * GET /api/protocol/{id}
   */
  getById(id: number): Observable<ApiResponse<ChargingProtocolDto>> {
    return this.http.get<ApiResponse<ChargingProtocolDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new charging protocol
   * POST /api/protocol
   */
  create(dto: CreateChargingProtocolDto): Observable<ApiResponse<ChargingProtocolDto>> {
    return this.http.post<ApiResponse<ChargingProtocolDto>>(this.baseUrl, dto);
  }

  /**
   * Update charging protocol
   * PUT /api/protocol/{id}
   */
  update(id: number, dto: UpdateChargingProtocolDto): Observable<ApiResponse<ChargingProtocolDto>> {
    return this.http.put<ApiResponse<ChargingProtocolDto>>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Delete charging protocol
   * DELETE /api/protocol/{id}
   */
  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
