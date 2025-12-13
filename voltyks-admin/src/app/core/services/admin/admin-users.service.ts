import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminUserDto,
  AdminUserDetailsDto,
  AdminWalletDto,
  AdminUserVehicleDto,
  AdminUserReportDto,
  AddBalanceRequestDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.users}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users with optional search
   * GET /api/admin/users?search=...
   */
  getUsers(search?: string): Observable<ApiResponse<AdminUserDto[]>> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<ApiResponse<AdminUserDto[]>>(this.baseUrl, { params });
  }

  /**
   * Get user details by ID
   * GET /api/admin/users/{id}
   */
  getUserById(id: string): Observable<ApiResponse<AdminUserDetailsDto>> {
    return this.http.get<ApiResponse<AdminUserDetailsDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Toggle user ban status
   * POST /api/admin/users/{id}/ban-toggle
   */
  toggleBan(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${id}/ban-toggle`, {});
  }

  /**
   * Get user wallet details
   * GET /api/admin/users/{id}/wallet
   */
  getUserWallet(id: string): Observable<ApiResponse<AdminWalletDto>> {
    return this.http.get<ApiResponse<AdminWalletDto>>(`${this.baseUrl}/${id}/wallet`);
  }

  /**
   * Get user vehicles
   * GET /api/admin/users/{id}/vehicles
   */
  getUserVehicles(id: string): Observable<ApiResponse<AdminUserVehicleDto[]>> {
    return this.http.get<ApiResponse<AdminUserVehicleDto[]>>(`${this.baseUrl}/${id}/vehicles`);
  }

  /**
   * Get user reports
   * GET /api/admin/users/{id}/reports
   */
  getUserReports(id: string): Observable<ApiResponse<AdminUserReportDto[]>> {
    return this.http.get<ApiResponse<AdminUserReportDto[]>>(`${this.baseUrl}/${id}/reports`);
  }

  /**
   * Add balance to user wallet
   * POST /api/admin/users/{id}/add-balance
   */
  addBalance(id: string, dto: AddBalanceRequestDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${id}/add-balance`, dto);
  }
}
