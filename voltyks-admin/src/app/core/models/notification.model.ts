// Notification Related DTOs

export type NotificationType = 'report' | 'complaint';

export interface AppNotification {
  id: string;              // "report_123" or "complaint_456"
  type: NotificationType;
  originalId: number;
  title: string;           // "بلاغ جديد" or "شكوى جديدة"
  message: string;
  userName: string;
  timestamp: string;       // ISO UTC
  isRead: boolean;
}

export interface NotificationsResponse {
  status: boolean;
  data: AppNotification[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
}

export interface UnreadCountResponse {
  status: boolean;
  data: number;
}
