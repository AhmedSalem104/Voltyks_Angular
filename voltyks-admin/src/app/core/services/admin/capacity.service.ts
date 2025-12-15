import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, CapacityDto, CreateCapacityDto, UpdateCapacityDto } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class CapacityService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/capacities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<CapacityDto[]>> {
    return this.http.get<ApiResponse<CapacityDto[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<CapacityDto>> {
    return this.http.get<ApiResponse<CapacityDto>>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateCapacityDto): Observable<ApiResponse<CapacityDto>> {
    return this.http.post<ApiResponse<CapacityDto>>(this.baseUrl, dto);
  }

  update(id: number, dto: UpdateCapacityDto): Observable<ApiResponse<CapacityDto>> {
    return this.http.put<ApiResponse<CapacityDto>>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
