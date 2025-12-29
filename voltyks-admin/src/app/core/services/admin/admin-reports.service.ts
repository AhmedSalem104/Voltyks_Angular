import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminReportDto,
  AdminReportDetailsDto,
  ReportFilterParams
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminReportsService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.reports}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all reports with filters
   * GET /api/admin/reports
   * Query Params: UserId, StartDate, EndDate, IsResolved
   */
  getReports(filter?: ReportFilterParams): Observable<ApiResponse<AdminReportDto[]>> {
    let params = new HttpParams();

    if (filter) {
      if (filter.userId) {
        params = params.set('UserId', filter.userId);
      }
      if (filter.startDate) {
        params = params.set('StartDate', filter.startDate);
      }
      if (filter.endDate) {
        params = params.set('EndDate', filter.endDate);
      }
      if (filter.isResolved !== undefined) {
        params = params.set('IsResolved', filter.isResolved.toString());
      }
    }

    return this.http.get<ApiResponse<AdminReportDto[]>>(this.baseUrl, { params });
  }

  /**
   * Get report details by ID
   * GET /api/admin/reports/{id}
   */
  getReportById(id: number): Observable<ApiResponse<AdminReportDetailsDto>> {
    return this.http.get<ApiResponse<AdminReportDetailsDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update report status
   * PATCH /api/admin/reports/{id}/status?isResolved=true/false
   */
  updateReportStatus(id: number, isResolved: boolean): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(
      `${this.baseUrl}/${id}/status?isResolved=${isResolved}`,
      null
    );
  }

  /**
   * Resolve report (mark as resolved)
   * PATCH /api/admin/reports/{id}/status?isResolved=true
   */
  resolveReport(id: number): Observable<ApiResponse<any>> {
    return this.updateReportStatus(id, true);
  }

  /**
   * Delete report
   * DELETE /api/admin/reports/{id}
   */
  deleteReport(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }
}
