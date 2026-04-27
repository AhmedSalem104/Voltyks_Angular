import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  NotificationTemplateDto,
  UpdateTemplateDto,
  PreviewTemplateDto,
  PreviewResponseDto,
  ResetTemplateResponseDto,
  SendToUserDto,
  SendToUserResponseDto,
  BroadcastDto,
  BroadcastResponseDto
} from '../../models';

/**
 * Admin Notification Center Service
 *
 * Wraps /api/admin/notifications/* endpoints used by the admin tooling
 * screens (templates / send-to-user / broadcast). The receive-side bell
 * dropdown lives in core/services/notification.service.ts and is
 * intentionally kept separate.
 */
@Injectable({ providedIn: 'root' })
export class AdminNotificationsCenterService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.admin.notificationsCenter}`;

  // Cache for the templates list — small (19 entries) and changes only
  // when an admin edits or resets one. We keep it in-memory and invalidate
  // on any successful PUT/DELETE.
  private templatesCache$ = new BehaviorSubject<NotificationTemplateDto[] | null>(null);
  private templatesCacheLoading = false;

  constructor(private http: HttpClient) {}

  // ========== Templates ==========

  /**
   * GET /api/admin/notifications/templates
   */
  listTemplates(forceRefresh = false): Observable<ApiResponse<NotificationTemplateDto[]>> {
    const cached = this.templatesCache$.getValue();
    if (!forceRefresh && cached && !this.templatesCacheLoading) {
      return of({ status: true, data: cached, message: 'success' });
    }

    if (this.templatesCacheLoading) {
      return this.http.get<ApiResponse<NotificationTemplateDto[]>>(`${this.baseUrl}/templates`);
    }

    this.templatesCacheLoading = true;
    return this.http.get<ApiResponse<NotificationTemplateDto[]>>(`${this.baseUrl}/templates`).pipe(
      tap(response => {
        if (response.status && response.data) {
          this.templatesCache$.next(response.data);
        }
        this.templatesCacheLoading = false;
      })
    );
  }

  invalidateTemplatesCache(): void {
    this.templatesCache$.next(null);
  }

  /**
   * GET /api/admin/notifications/templates/{key}
   */
  getTemplate(key: string): Observable<ApiResponse<NotificationTemplateDto>> {
    return this.http.get<ApiResponse<NotificationTemplateDto>>(
      `${this.baseUrl}/templates/${encodeURIComponent(key)}`
    );
  }

  /**
   * PUT /api/admin/notifications/templates/{key}
   *
   * Server enforces that every requiredParam appears as `{paramName}` in
   * the EN body+title combined and the AR body+title combined. The client
   * should run the same check via validateUpdate() before calling.
   */
  updateTemplate(key: string, dto: UpdateTemplateDto): Observable<ApiResponse<NotificationTemplateDto>> {
    return this.http
      .put<ApiResponse<NotificationTemplateDto>>(
        `${this.baseUrl}/templates/${encodeURIComponent(key)}`,
        dto
      )
      .pipe(
        tap(response => {
          if (response.status) this.invalidateTemplatesCache();
        })
      );
  }

  /**
   * DELETE /api/admin/notifications/templates/{key}
   *
   * Removes the customised DB row and reverts to the hardcoded fallback.
   */
  resetTemplate(key: string): Observable<ApiResponse<ResetTemplateResponseDto>> {
    return this.http
      .delete<ApiResponse<ResetTemplateResponseDto>>(
        `${this.baseUrl}/templates/${encodeURIComponent(key)}`
      )
      .pipe(
        tap(response => {
          if (response.status) this.invalidateTemplatesCache();
        })
      );
  }

  /**
   * POST /api/admin/notifications/templates/{key}/preview
   *
   * Renders the (possibly draft) template against a set of param values
   * and returns the resolved title+body for either language.
   */
  previewTemplate(
    key: string,
    dto: PreviewTemplateDto
  ): Observable<ApiResponse<PreviewResponseDto>> {
    return this.http.post<ApiResponse<PreviewResponseDto>>(
      `${this.baseUrl}/templates/${encodeURIComponent(key)}/preview`,
      dto
    );
  }

  // ========== Send & Broadcast ==========

  /**
   * POST /api/admin/notifications/send-to-user
   */
  sendToUser(dto: SendToUserDto): Observable<ApiResponse<SendToUserResponseDto>> {
    return this.http.post<ApiResponse<SendToUserResponseDto>>(
      `${this.baseUrl}/send-to-user`,
      dto
    );
  }

  /**
   * POST /api/admin/notifications/broadcast
   */
  broadcast(dto: BroadcastDto): Observable<ApiResponse<BroadcastResponseDto>> {
    return this.http.post<ApiResponse<BroadcastResponseDto>>(
      `${this.baseUrl}/broadcast`,
      dto
    );
  }
}

// ========== Validation helpers ==========

/**
 * Mirror of the server-side validation: every required placeholder must
 * appear at least once across (titleEn + bodyEn) AND across (titleAr + bodyAr).
 *
 * Returns the list of missing placeholder names (empty if all present).
 */
export function validateTemplateUpdate(
  required: string[],
  dto: UpdateTemplateDto
): { missingEn: string[]; missingAr: string[] } {
  const enText = `${dto.titleEn ?? ''} ${dto.bodyEn ?? ''}`;
  const arText = `${dto.titleAr ?? ''} ${dto.bodyAr ?? ''}`;
  const missingEn = required.filter(p => !enText.includes(`{${p}}`));
  const missingAr = required.filter(p => !arText.includes(`{${p}}`));
  return { missingEn, missingAr };
}
