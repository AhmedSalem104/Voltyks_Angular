import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminsModeStatusResponse,
  AdminAdminsModeResponse,
  UpdateAdminsModeDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminsModeService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;
  private readonly adminBaseUrl = `${environment.apiBaseUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  /**
   * Get registration status (Public endpoint)
   * GET /api/v1/app-config/registration-status
   */
  getRegistrationStatus(): Observable<AdminsModeStatusResponse> {
    return this.http.get<AdminsModeStatusResponse>(`${this.baseUrl}/app-config/registration-status`);
  }

  /**
   * Get admins mode status (Admin endpoint)
   * GET /api/admin/settings/admins-mode
   */
  getAdminsMode(): Observable<AdminAdminsModeResponse> {
    return this.http.get<AdminAdminsModeResponse>(`${this.adminBaseUrl}/settings/admins-mode`);
  }

  /**
   * Update admins mode (Admin endpoint)
   * PATCH /api/admin/settings/admins-mode
   */
  updateAdminsMode(dto: UpdateAdminsModeDto): Observable<AdminAdminsModeResponse> {
    return this.http.patch<AdminAdminsModeResponse>(`${this.adminBaseUrl}/settings/admins-mode`, dto);
  }
}
