import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MobileAppConfigResponse, UpdateMobileAppConfigDto } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  /**
   * Get mobile app status (Public endpoint)
   */
  getMobileAppStatus(): Observable<MobileAppConfigResponse> {
    return this.http.get<MobileAppConfigResponse>(`${this.baseUrl}/app-config/mobile-enabled`);
  }

  /**
   * Update mobile app status (Admin endpoint - requires JWT)
   */
  updateMobileAppStatus(dto: UpdateMobileAppConfigDto): Observable<MobileAppConfigResponse> {
    return this.http.patch<MobileAppConfigResponse>(`${this.baseUrl}/admin/app-config/mobile-enabled`, dto);
  }
}
