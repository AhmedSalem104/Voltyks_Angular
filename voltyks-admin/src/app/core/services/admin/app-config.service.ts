import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MobileAppConfigResponse,
  UpdateMobileAppConfigDto,
  AdminMobileConfigResponse,
  UpdateAdminMobileConfigDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  // ============ Legacy Endpoints (Backwards Compatible) ============

  /**
   * Get mobile app status (Public endpoint - legacy)
   * GET /api/v1/app-config/mobile-enabled
   */
  getMobileAppStatus(): Observable<MobileAppConfigResponse> {
    return this.http.get<MobileAppConfigResponse>(`${this.baseUrl}/app-config/mobile-enabled`);
  }

  /**
   * Update mobile app status (Admin endpoint - legacy)
   * PATCH /api/v1/admin/app-config/mobile-enabled
   */
  updateMobileAppStatus(dto: UpdateMobileAppConfigDto): Observable<MobileAppConfigResponse> {
    return this.http.patch<MobileAppConfigResponse>(`${this.baseUrl}/admin/app-config/mobile-enabled`, dto);
  }

  // ============ New Admin Endpoints (Platform-Specific) ============

  /**
   * Get full mobile config (Admin endpoint)
   * GET /api/v1/admin/app-config/mobile-status
   */
  getAdminMobileConfig(): Observable<AdminMobileConfigResponse> {
    return this.http.get<AdminMobileConfigResponse>(`${this.baseUrl}/admin/app-config/mobile-status`);
  }

  /**
   * Update mobile config (Admin endpoint)
   * PATCH /api/v1/admin/app-config/mobile-status
   */
  updateAdminMobileConfig(dto: UpdateAdminMobileConfigDto): Observable<AdminMobileConfigResponse> {
    return this.http.patch<AdminMobileConfigResponse>(`${this.baseUrl}/admin/app-config/mobile-status`, dto);
  }
}
