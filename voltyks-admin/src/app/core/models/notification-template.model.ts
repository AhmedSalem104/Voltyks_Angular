// ============= Notification Templates =============

export interface NotificationTemplateDto {
  key: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  requiredParams: string[];
  isCustomized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface UpdateTemplateDto {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

export interface PreviewTemplateDto {
  lang: 'ar' | 'en';
  params: Record<string, string>;
}

export interface PreviewResponseDto {
  title: string;
  body: string;
  fromDb: boolean;
}

export interface ResetTemplateResponseDto {
  key: string;
  reset: boolean;
}

// ============= Send / Broadcast =============

export type NotificationSendMode = 'template' | 'custom';

export interface NotificationTemplatePayload {
  key: string;
  params: Record<string, string>;
}

export interface NotificationCustomPayload {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

export interface SendToUserDto {
  userId: string;
  mode: NotificationSendMode;
  template?: NotificationTemplatePayload;
  custom?: NotificationCustomPayload;
}

export interface SendToUserResponseDto {
  notificationId: number;
  userId: string;
  title: string;
  body: string;
  pushSent: number;
}

export type BroadcastAudienceType = 'all' | 'role' | 'users' | 'city';
export type BroadcastRole = 'vehicle_owner' | 'charger_owner';

export interface BroadcastAudience {
  type: BroadcastAudienceType;
  role?: BroadcastRole;
  userIds?: string[];
  city?: string;
}

export interface BroadcastDto {
  audience: BroadcastAudience;
  mode: NotificationSendMode;
  template?: NotificationTemplatePayload;
  custom?: NotificationCustomPayload;
}

export interface BroadcastResponseDto {
  broadcastId: number;
  recipientCount: number;
  dbPersistedCount: number;
  fcmAttemptedCount: number;
  fcmSucceededCount: number;
}
