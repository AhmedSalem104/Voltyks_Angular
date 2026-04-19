import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PagedVehicleAdditionRequestsResponse,
  VehicleAdditionRequestResponse,
  AcceptVehicleAdditionRequestResponse,
  DeclineVehicleAdditionRequestResponse,
  VehicleAdditionRequestStatus
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class VehicleAdditionRequestsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/vehicle-addition-requests`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/admin/vehicle-addition-requests
   */
  getAll(
    status: VehicleAdditionRequestStatus | null = null,
    pageNumber = 1,
    pageSize = 20
  ): Observable<PagedVehicleAdditionRequestsResponse> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<PagedVehicleAdditionRequestsResponse>(this.baseUrl, { params });
  }

  /**
   * GET /api/admin/vehicle-addition-requests/{id}
   */
  getById(id: number): Observable<VehicleAdditionRequestResponse> {
    return this.http.get<VehicleAdditionRequestResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * POST /api/admin/vehicle-addition-requests/{id}/accept
   */
  accept(id: number): Observable<AcceptVehicleAdditionRequestResponse> {
    return this.http.post<AcceptVehicleAdditionRequestResponse>(`${this.baseUrl}/${id}/accept`, {});
  }

  /**
   * POST /api/admin/vehicle-addition-requests/{id}/decline
   */
  decline(id: number): Observable<DeclineVehicleAdditionRequestResponse> {
    return this.http.post<DeclineVehicleAdditionRequestResponse>(`${this.baseUrl}/${id}/decline`, {});
  }
}
