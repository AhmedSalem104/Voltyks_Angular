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
  AddBalanceRequestDto,
  CreateAdminDto,
  CreatedAdminDto
} from '../../models';

export interface UserFilterParams {
  search?: string;
  includeDeleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.users}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users with optional filters
   * GET /api/admin/users
   * GET /api/admin/users?includeDeleted=true (includes soft-deleted users)
   * GET /api/admin/users?search=...
   */
  getUsers(filters?: UserFilterParams): Observable<ApiResponse<AdminUserDto[]>> {
    let params = new HttpParams();
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.includeDeleted) {
      params = params.set('includeDeleted', 'true');
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

  /**
   * Soft delete user (hides user but keeps in DB)
   * DELETE /api/admin/users/{id}
   * Returns: isDeleted=true, deletedAt=timestamp
   */
  deleteUser(id: string): Observable<ApiResponse<AdminUserDto>> {
    return this.http.delete<ApiResponse<AdminUserDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Permanent delete user (irreversible)
   * DELETE /api/admin/users/{id}/permanent
   * WARNING: This action cannot be undone
   */
  permanentDeleteUser(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}/permanent`);
  }

  /**
   * Restore soft-deleted user
   * PATCH /api/admin/users/{id}/restore
   * Returns: isDeleted=false
   */
  restoreUser(id: string): Observable<ApiResponse<AdminUserDto>> {
    return this.http.patch<ApiResponse<AdminUserDto>>(`${this.baseUrl}/${id}/restore`, {});
  }

  /**
   * Send OTP to current admin's phone for creating a new admin
   * POST /api/admin/users/create-admin/send-otp
   */
  sendCreateAdminOtp(): Observable<ApiResponse<{ phoneHint: string }>> {
    return this.http.post<ApiResponse<{ phoneHint: string }>>(`${this.baseUrl}/create-admin/send-otp`, {});
  }

  /**
   * Create a new admin account (requires OTP verification)
   * POST /api/admin/users/create-admin
   */
  createAdmin(dto: CreateAdminDto): Observable<ApiResponse<CreatedAdminDto>> {
    return this.http.post<ApiResponse<CreatedAdminDto>>(`${this.baseUrl}/create-admin`, dto);
  }
}
