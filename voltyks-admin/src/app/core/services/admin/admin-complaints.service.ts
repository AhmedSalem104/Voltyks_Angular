import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  CreateGeneralComplaintDto,
  GeneralComplaintResponseDto,
  AdminComplaintDto,
  ComplaintFilterParams,
  UpdateComplaintStatusResponse
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminComplaintsService {
  private readonly authUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.auth.generalComplaints}`;
  private readonly adminUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.complaints}`;

  constructor(private http: HttpClient) {}

  /**
   * Create new general complaint (User endpoint)
   * POST /api/auth/general-complaints
   */
  createComplaint(dto: CreateGeneralComplaintDto): Observable<ApiResponse<GeneralComplaintResponseDto>> {
    return this.http.post<ApiResponse<GeneralComplaintResponseDto>>(this.authUrl, dto);
  }

  /**
   * Get all complaints with filters
   * GET /api/admin/complaints
   * Query Params: includeResolved (optional, default: true)
   */
  getComplaints(filters?: ComplaintFilterParams): Observable<ApiResponse<AdminComplaintDto[]>> {
    let params = new HttpParams();

    if (filters?.includeResolved !== undefined) {
      params = params.set('includeResolved', filters.includeResolved.toString());
    }

    return this.http.get<ApiResponse<AdminComplaintDto[]>>(this.adminUrl, { params });
  }

  /**
   * Get complaint by ID
   * GET /api/admin/complaints/{id}
   */
  getComplaintById(id: number): Observable<ApiResponse<AdminComplaintDto>> {
    return this.http.get<ApiResponse<AdminComplaintDto>>(`${this.adminUrl}/${id}`);
  }

  /**
   * Update complaint status (resolved/unresolved)
   * PATCH /api/admin/complaints/{id}/status?isResolved=true/false
   */
  updateComplaintStatus(id: number, isResolved: boolean): Observable<ApiResponse<UpdateComplaintStatusResponse>> {
    const params = new HttpParams().set('isResolved', isResolved.toString());
    return this.http.patch<ApiResponse<UpdateComplaintStatusResponse>>(`${this.adminUrl}/${id}/status`, null, { params });
  }
}
