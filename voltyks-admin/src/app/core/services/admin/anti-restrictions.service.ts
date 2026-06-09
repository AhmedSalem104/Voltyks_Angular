import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminAntiOtpRestrictionResponse,
  UpdateAntiOtpRestrictionDto,
  AdminAntiPaymentRestrictionResponse,
  UpdateAntiPaymentRestrictionDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AntiRestrictionsService {
  private readonly adminBaseUrl = `${environment.apiBaseUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  // ============ Anti-OTP Restriction Mode ============

  /**
   * Get anti-OTP restriction mode status
   * GET /api/admin/settings/anti-otp-restriction-mode
   */
  getAntiOtpRestriction(): Observable<AdminAntiOtpRestrictionResponse> {
    return this.http.get<AdminAntiOtpRestrictionResponse>(
      `${this.adminBaseUrl}/settings/anti-otp-restriction-mode`
    );
  }

  /**
   * Update anti-OTP restriction mode
   * PATCH /api/admin/settings/anti-otp-restriction-mode
   */
  updateAntiOtpRestriction(dto: UpdateAntiOtpRestrictionDto): Observable<AdminAntiOtpRestrictionResponse> {
    return this.http.patch<AdminAntiOtpRestrictionResponse>(
      `${this.adminBaseUrl}/settings/anti-otp-restriction-mode`,
      dto
    );
  }

  // ============ Anti-Payment Restriction Mode ============

  /**
   * Get anti-payment restriction mode status
   * GET /api/admin/settings/anti-payment-restriction-mode
   */
  getAntiPaymentRestriction(): Observable<AdminAntiPaymentRestrictionResponse> {
    return this.http.get<AdminAntiPaymentRestrictionResponse>(
      `${this.adminBaseUrl}/settings/anti-payment-restriction-mode`
    );
  }

  /**
   * Update anti-payment restriction mode
   * PATCH /api/admin/settings/anti-payment-restriction-mode
   */
  updateAntiPaymentRestriction(dto: UpdateAntiPaymentRestrictionDto): Observable<AdminAntiPaymentRestrictionResponse> {
    return this.http.patch<AdminAntiPaymentRestrictionResponse>(
      `${this.adminBaseUrl}/settings/anti-payment-restriction-mode`,
      dto
    );
  }
}
