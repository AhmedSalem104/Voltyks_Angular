import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminTermsDto,
  UpdateTermsDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminTermsService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.terms}`;

  constructor(private http: HttpClient) {}

  /**
   * Get terms by language
   * GET /api/admin/terms?lang=xx
   */
  getTerms(lang: string = 'en'): Observable<ApiResponse<AdminTermsDto>> {
    const params = new HttpParams().set('lang', lang);
    return this.http.get<ApiResponse<AdminTermsDto>>(this.baseUrl, { params });
  }

  /**
   * Update terms
   * PUT /api/admin/terms
   */
  updateTerms(dto: UpdateTermsDto): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(this.baseUrl, dto);
  }
}
