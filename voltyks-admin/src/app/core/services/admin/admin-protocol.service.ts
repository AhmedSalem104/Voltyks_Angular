import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, AdminProtocolDto } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminProtocolService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.protocol}`;

  constructor(private http: HttpClient) {}

  /**
   * Get protocol details by type (read-only)
   * GET /api/admin/protocol?type=chinese|european
   * @param type - Protocol type: 'chinese' or 'european'
   */
  getProtocol(type: 'chinese' | 'european' = 'chinese'): Observable<ApiResponse<AdminProtocolDto>> {
    const params = { type };
    return this.http.get<ApiResponse<AdminProtocolDto>>(this.baseUrl, { params });
  }
}
