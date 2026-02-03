import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AdminStoreCategoryDto,
  CreateStoreCategoryDto,
  UpdateStoreCategoryDto,
  CategoryFilterParams,
  AdminStoreProductDto,
  CreateStoreProductDto,
  UpdateStoreProductDto,
  ProductFilterParams,
  AdminReservationDto,
  ReservationFilterParams,
  RecordContactDto,
  RecordPaymentDto,
  RecordDeliveryDto,
  PagedResult,
  ProductImageUploadResult,
  DeleteProductImageDto
} from '../../models';

@Injectable({
  providedIn: 'root'
})
export class AdminStoreService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/store`;

  // Cache state for categories (no filters)
  private categoriesCache$ = new BehaviorSubject<AdminStoreCategoryDto[] | null>(null);
  private categoriesCacheLoading = false;

  // Cache state for products (no filters)
  private productsCache$ = new BehaviorSubject<AdminStoreProductDto[] | null>(null);
  private productsCacheLoading = false;

  constructor(private http: HttpClient) {}

  // ==================== Categories ====================

  /**
   * Get all categories with optional filters (cached when no filters)
   * GET /api/admin/store/categories
   * @param params Optional filter parameters
   * @param forceRefresh Force refresh cache (only when no params)
   */
  getCategories(params?: CategoryFilterParams, forceRefresh = false): Observable<ApiResponse<AdminStoreCategoryDto[]>> {
    // Only cache when no filters are applied
    const hasFilters = params && (params.withTrashed || params.onlyTrashed || params.status);

    if (!hasFilters) {
      const cachedCategories = this.categoriesCache$.getValue();
      if (!forceRefresh && cachedCategories && !this.categoriesCacheLoading) {
        return of({ status: true, data: cachedCategories, message: 'success' });
      }

      if (this.categoriesCacheLoading) {
        return this.http.get<ApiResponse<AdminStoreCategoryDto[]>>(`${this.baseUrl}/categories`);
      }

      this.categoriesCacheLoading = true;
      return this.http.get<ApiResponse<AdminStoreCategoryDto[]>>(`${this.baseUrl}/categories`).pipe(
        tap(response => {
          if (response.status && response.data) {
            this.categoriesCache$.next(response.data);
          }
          this.categoriesCacheLoading = false;
        })
      );
    }

    // Filtered request - no caching
    let httpParams = new HttpParams();
    if (params) {
      if (params.withTrashed !== undefined) {
        httpParams = httpParams.set('withTrashed', params.withTrashed.toString());
      }
      if (params.onlyTrashed !== undefined) {
        httpParams = httpParams.set('onlyTrashed', params.onlyTrashed.toString());
      }
      if (params.status) {
        httpParams = httpParams.set('status', params.status);
      }
    }
    return this.http.get<ApiResponse<AdminStoreCategoryDto[]>>(`${this.baseUrl}/categories`, { params: httpParams });
  }

  /**
   * Invalidate categories cache
   */
  invalidateCategoriesCache(): void {
    this.categoriesCache$.next(null);
  }

  /**
   * Get category by ID
   * GET /api/admin/store/categories/{id}
   */
  getCategoryById(id: number): Observable<ApiResponse<AdminStoreCategoryDto>> {
    return this.http.get<ApiResponse<AdminStoreCategoryDto>>(`${this.baseUrl}/categories/${id}`);
  }

  /**
   * Create new category
   * POST /api/admin/store/categories
   */
  createCategory(dto: CreateStoreCategoryDto): Observable<ApiResponse<AdminStoreCategoryDto>> {
    return this.http.post<ApiResponse<AdminStoreCategoryDto>>(`${this.baseUrl}/categories`, dto).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateCategoriesCache();
        }
      })
    );
  }

  /**
   * Update category
   * PUT /api/admin/store/categories/{id}
   */
  updateCategory(id: number, dto: UpdateStoreCategoryDto): Observable<ApiResponse<AdminStoreCategoryDto>> {
    return this.http.put<ApiResponse<AdminStoreCategoryDto>>(`${this.baseUrl}/categories/${id}`, dto).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateCategoriesCache();
        }
      })
    );
  }

  /**
   * Soft delete category
   * DELETE /api/admin/store/categories/{id}
   */
  deleteCategory(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/categories/${id}`).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateCategoriesCache();
        }
      })
    );
  }

  /**
   * Restore soft-deleted category
   * POST /api/admin/store/categories/{id}/restore
   */
  restoreCategory(id: number): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/categories/${id}/restore`, {}).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateCategoriesCache();
        }
      })
    );
  }

  /**
   * Force delete category permanently
   * DELETE /api/admin/store/categories/{id}/force
   */
  forceDeleteCategory(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/categories/${id}/force`).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateCategoriesCache();
        }
      })
    );
  }

  // ==================== Products ====================

  /**
   * Get all products with optional filters (cached when no filters)
   * GET /api/admin/store/products
   * @param params Optional filter parameters
   * @param forceRefresh Force refresh cache (only when no params)
   */
  getProducts(params?: ProductFilterParams, forceRefresh = false): Observable<ApiResponse<AdminStoreProductDto[]>> {
    // Only cache when no filters are applied
    const hasFilters = params && (params.categoryId !== undefined || params.status || params.withTrashed || params.onlyTrashed);

    if (!hasFilters) {
      const cachedProducts = this.productsCache$.getValue();
      if (!forceRefresh && cachedProducts && !this.productsCacheLoading) {
        return of({ status: true, data: cachedProducts, message: 'success' });
      }

      if (this.productsCacheLoading) {
        return this.http.get<ApiResponse<AdminStoreProductDto[]>>(`${this.baseUrl}/products`);
      }

      this.productsCacheLoading = true;
      return this.http.get<ApiResponse<AdminStoreProductDto[]>>(`${this.baseUrl}/products`).pipe(
        tap(response => {
          if (response.status && response.data) {
            this.productsCache$.next(response.data);
          }
          this.productsCacheLoading = false;
        })
      );
    }

    // Filtered request - no caching
    let httpParams = new HttpParams();
    if (params) {
      if (params.categoryId !== undefined) {
        httpParams = httpParams.set('categoryId', params.categoryId.toString());
      }
      if (params.status) {
        httpParams = httpParams.set('status', params.status);
      }
      if (params.withTrashed !== undefined) {
        httpParams = httpParams.set('withTrashed', params.withTrashed.toString());
      }
      if (params.onlyTrashed !== undefined) {
        httpParams = httpParams.set('onlyTrashed', params.onlyTrashed.toString());
      }
    }
    return this.http.get<ApiResponse<AdminStoreProductDto[]>>(`${this.baseUrl}/products`, { params: httpParams });
  }

  /**
   * Invalidate products cache
   */
  invalidateProductsCache(): void {
    this.productsCache$.next(null);
  }

  /**
   * Get product by ID
   * GET /api/admin/store/products/{id}
   */
  getProductById(id: number): Observable<ApiResponse<AdminStoreProductDto>> {
    return this.http.get<ApiResponse<AdminStoreProductDto>>(`${this.baseUrl}/products/${id}`);
  }

  /**
   * Create new product
   * POST /api/admin/store/products
   */
  createProduct(dto: CreateStoreProductDto): Observable<ApiResponse<AdminStoreProductDto>> {
    return this.http.post<ApiResponse<AdminStoreProductDto>>(`${this.baseUrl}/products`, dto).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateProductsCache();
          this.invalidateCategoriesCache(); // Category's product count changes
        }
      })
    );
  }

  /**
   * Update product
   * PUT /api/admin/store/products/{id}
   */
  updateProduct(id: number, dto: UpdateStoreProductDto): Observable<ApiResponse<AdminStoreProductDto>> {
    return this.http.put<ApiResponse<AdminStoreProductDto>>(`${this.baseUrl}/products/${id}`, dto).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateProductsCache();
        }
      })
    );
  }

  /**
   * Soft delete product
   * DELETE /api/admin/store/products/{id}
   */
  deleteProduct(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/products/${id}`).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateProductsCache();
          this.invalidateCategoriesCache(); // Category's product count changes
        }
      })
    );
  }

  /**
   * Restore soft-deleted product
   * POST /api/admin/store/products/{id}/restore
   */
  restoreProduct(id: number): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/products/${id}/restore`, {}).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateProductsCache();
          this.invalidateCategoriesCache(); // Category's product count changes
        }
      })
    );
  }

  /**
   * Force delete product permanently
   * DELETE /api/admin/store/products/{id}/force
   */
  forceDeleteProduct(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/products/${id}/force`).pipe(
      tap(response => {
        if (response.status) {
          this.invalidateProductsCache();
          this.invalidateCategoriesCache(); // Category's product count changes
        }
      })
    );
  }

  // ==================== Product Images ====================

  /**
   * Upload images to product
   * POST /api/admin/store/products/{id}/images
   */
  uploadProductImages(productId: number, files: File[]): Observable<ApiResponse<ProductImageUploadResult>> {
    const formData = new FormData();
    files.forEach(file => formData.append('Images', file));
    return this.http.post<ApiResponse<ProductImageUploadResult>>(
      `${this.baseUrl}/products/${productId}/images`,
      formData
    );
  }

  /**
   * Delete a specific image from product
   * DELETE /api/admin/store/products/{id}/images
   */
  deleteProductImage(productId: number, imagePath: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.baseUrl}/products/${productId}/images`,
      { body: { imagePath } as DeleteProductImageDto }
    );
  }

  /**
   * Delete all local images from product
   * DELETE /api/admin/store/products/{id}/images/all
   */
  deleteAllProductImages(productId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/products/${productId}/images/all`);
  }

  /**
   * Get full image URL (handles local and external URLs)
   */
  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // External URL - return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    // Ensure path starts with /
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    // Prepend API base URL for local images (critical for production)
    return environment.apiBaseUrl ? `${environment.apiBaseUrl}${normalizedPath}` : normalizedPath;
  }

  // ==================== Reservations ====================

  /**
   * Get all reservations with optional filters and pagination
   * GET /api/admin/store/reservations
   */
  getReservations(params?: ReservationFilterParams): Observable<ApiResponse<PagedResult<AdminReservationDto>>> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.status) {
        httpParams = httpParams.set('status', params.status);
      }
      if (params.paymentStatus) {
        httpParams = httpParams.set('paymentStatus', params.paymentStatus);
      }
      if (params.deliveryStatus) {
        httpParams = httpParams.set('deliveryStatus', params.deliveryStatus);
      }
      if (params.fromDate) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.search) {
        httpParams = httpParams.set('search', params.search);
      }
      if (params.pageNumber !== undefined) {
        httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
      }
      if (params.pageSize !== undefined) {
        httpParams = httpParams.set('pageSize', params.pageSize.toString());
      }
    }
    return this.http.get<ApiResponse<PagedResult<AdminReservationDto>>>(`${this.baseUrl}/reservations`, { params: httpParams });
  }

  /**
   * Get reservation by ID
   * GET /api/admin/store/reservations/{id}
   */
  getReservationById(id: number): Observable<ApiResponse<AdminReservationDto>> {
    return this.http.get<ApiResponse<AdminReservationDto>>(`${this.baseUrl}/reservations/${id}`);
  }

  /**
   * Record contact with customer
   * PUT /api/admin/store/reservations/{id}/contact
   */
  recordContact(id: number, dto: RecordContactDto): Observable<ApiResponse<AdminReservationDto>> {
    return this.http.put<ApiResponse<AdminReservationDto>>(`${this.baseUrl}/reservations/${id}/contact`, dto);
  }

  /**
   * Record payment
   * PUT /api/admin/store/reservations/{id}/payment
   */
  recordPayment(id: number, dto: RecordPaymentDto): Observable<ApiResponse<AdminReservationDto>> {
    return this.http.put<ApiResponse<AdminReservationDto>>(`${this.baseUrl}/reservations/${id}/payment`, dto);
  }

  /**
   * Record delivery
   * PUT /api/admin/store/reservations/{id}/delivery
   */
  recordDelivery(id: number, dto: RecordDeliveryDto): Observable<ApiResponse<AdminReservationDto>> {
    return this.http.put<ApiResponse<AdminReservationDto>>(`${this.baseUrl}/reservations/${id}/delivery`, dto);
  }

  /**
   * Complete reservation
   * PUT /api/admin/store/reservations/{id}/complete
   */
  completeReservation(id: number): Observable<ApiResponse<AdminReservationDto>> {
    return this.http.put<ApiResponse<AdminReservationDto>>(`${this.baseUrl}/reservations/${id}/complete`, {});
  }

  /**
   * Cancel reservation
   * PUT /api/admin/store/reservations/{id}/cancel
   */
  cancelReservation(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/reservations/${id}/cancel`, {});
  }

  /**
   * Update reservation status
   * Routes to appropriate endpoint based on status
   */
  updateReservationStatus(id: number, status: string): Observable<ApiResponse<any>> {
    switch (status) {
      case 'contacted':
        return this.recordContact(id, { notes: '' });
      case 'completed':
        return this.completeReservation(id);
      case 'cancelled':
        return this.cancelReservation(id);
      default:
        // For pending or unknown status, use a generic PATCH
        return this.http.patch<ApiResponse<any>>(`${this.baseUrl}/reservations/${id}/status`, { status });
    }
  }

  /**
   * Update payment status
   * PUT /api/admin/store/reservations/{id}/payment
   */
  updatePaymentStatus(id: number, status: string): Observable<ApiResponse<AdminReservationDto>> {
    // Map status to appropriate payment method for the API
    const dto: RecordPaymentDto = {
      paymentMethod: status === 'paid' ? 'cash' : 'other',
      notes: status === 'refunded' ? 'Refunded' : undefined
    };
    return this.recordPayment(id, dto);
  }
}
