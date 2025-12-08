import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, AdminProcessDto } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminProcessesService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.processes}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all charging processes
   * GET /api/admin/process
   * Note: This API doesn't support filter parameters, filtering is done client-side
   */
  getProcesses(): Observable<ApiResponse<AdminProcessDto[]>> {
    return this.http.get<ApiResponse<AdminProcessDto[]>>(this.baseUrl);
  }

  /**
   * Get process by ID
   * GET /api/admin/process/{id}
   */
  getProcessById(id: number): Observable<ApiResponse<AdminProcessDto>> {
    return this.http.get<ApiResponse<AdminProcessDto>>(`${this.baseUrl}/${id}`);
  }
}
