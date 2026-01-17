import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminChargerDto,
  AdminCreateChargerDto,
  AdminUpdateChargerDto,
  ProtocolDto,
  CapacityDto,
  PriceOptionDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminChargersService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.chargers}`;

  // Cache for lookup tables (long TTL - rarely changes)
  private protocolsCache$ = new BehaviorSubject<ProtocolDto[] | null>(null);
  private capacitiesCache$ = new BehaviorSubject<CapacityDto[] | null>(null);
  private priceOptionsCache$ = new BehaviorSubject<PriceOptionDto[] | null>(null);
  private protocolsCacheLoading = false;
  private capacitiesCacheLoading = false;
  private priceOptionsCacheLoading = false;

  constructor(private http: HttpClient) {}

  /**
   * Get all chargers with optional userId filter
   * GET /api/admin/chargers?userId=...
   */
  getChargers(userId?: string): Observable<ApiResponse<AdminChargerDto[]>> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.get<ApiResponse<AdminChargerDto[]>>(this.baseUrl, { params });
  }

  /**
   * Get charger by ID
   * GET /api/admin/chargers/{id}
   */
  getChargerById(id: number): Observable<ApiResponse<AdminChargerDto>> {
    return this.http.get<ApiResponse<AdminChargerDto>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new charger
   * POST /api/admin/chargers
   */
  createCharger(charger: AdminCreateChargerDto): Observable<ApiResponse<AdminChargerDto>> {
    return this.http.post<ApiResponse<AdminChargerDto>>(this.baseUrl, charger);
  }

  /**
   * Update charger
   * PUT /api/admin/chargers/{id}
   */
  updateCharger(id: number, charger: AdminUpdateChargerDto): Observable<ApiResponse<AdminChargerDto>> {
    return this.http.put<ApiResponse<AdminChargerDto>>(`${this.baseUrl}/${id}`, charger);
  }

  /**
   * Delete charger
   * DELETE /api/admin/chargers/{id}
   */
  deleteCharger(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Toggle charger status (active/inactive)
   * PATCH /api/admin/chargers/{id}/status?isActive=...
   */
  toggleStatus(id: number, isActive: boolean): Observable<ApiResponse<void>> {
    const params = new HttpParams().set('isActive', isActive.toString());
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/status`, {}, { params });
  }

  // ========== Lookup Tables (Cached) ==========

  /**
   * Get all charging protocols (cached)
   * GET /api/protocol
   */
  getProtocols(forceRefresh = false): Observable<ApiResponse<ProtocolDto[]>> {
    const cached = this.protocolsCache$.getValue();
    if (!forceRefresh && cached && !this.protocolsCacheLoading) {
      return of({ status: true, data: cached, message: 'success' });
    }

    if (this.protocolsCacheLoading) {
      return this.http.get<ApiResponse<ProtocolDto[]>>(`${environment.apiBaseUrl}/api/protocol`);
    }

    this.protocolsCacheLoading = true;
    return this.http.get<ApiResponse<ProtocolDto[]>>(`${environment.apiBaseUrl}/api/protocol`).pipe(
      tap(response => {
        if (response.status && response.data) {
          this.protocolsCache$.next(response.data);
        }
        this.protocolsCacheLoading = false;
      })
    );
  }

  /**
   * Get all capacities (cached)
   * GET /api/admin/capacity
   */
  getCapacities(forceRefresh = false): Observable<ApiResponse<CapacityDto[]>> {
    const cached = this.capacitiesCache$.getValue();
    if (!forceRefresh && cached && !this.capacitiesCacheLoading) {
      return of({ status: true, data: cached, message: 'success' });
    }

    if (this.capacitiesCacheLoading) {
      return this.http.get<ApiResponse<CapacityDto[]>>(`${environment.apiBaseUrl}/api/admin/capacity`);
    }

    this.capacitiesCacheLoading = true;
    return this.http.get<ApiResponse<CapacityDto[]>>(`${environment.apiBaseUrl}/api/admin/capacity`).pipe(
      tap(response => {
        if (response.status && response.data) {
          this.capacitiesCache$.next(response.data);
        }
        this.capacitiesCacheLoading = false;
      })
    );
  }

  /**
   * Get all price options (cached)
   */
  getPriceOptions(forceRefresh = false): Observable<ApiResponse<PriceOptionDto[]>> {
    const cached = this.priceOptionsCache$.getValue();
    if (!forceRefresh && cached && !this.priceOptionsCacheLoading) {
      return of({ status: true, data: cached, message: 'success' });
    }

    if (this.priceOptionsCacheLoading) {
      return this.http.get<ApiResponse<PriceOptionDto[]>>(`${environment.apiBaseUrl}/api/admin/price-options`);
    }

    this.priceOptionsCacheLoading = true;
    return this.http.get<ApiResponse<PriceOptionDto[]>>(`${environment.apiBaseUrl}/api/admin/price-options`).pipe(
      tap(response => {
        if (response.status && response.data) {
          this.priceOptionsCache$.next(response.data);
        }
        this.priceOptionsCacheLoading = false;
      })
    );
  }

  /**
   * Invalidate all lookup caches
   */
  invalidateLookupCaches(): void {
    this.protocolsCache$.next(null);
    this.capacitiesCache$.next(null);
    this.priceOptionsCache$.next(null);
  }
}
