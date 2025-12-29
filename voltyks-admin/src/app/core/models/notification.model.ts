// Notification Related DTOs

export type NotificationType = 'report' | 'complaint' | 'reservation';

export interface AppNotification {
  id: string;              // "report_123" or "complaint_456" or "reservation_789"
  type: NotificationType;
  originalId: number;
  title: string;           // "بلاغ جديد" or "شكوى جديدة" or "حجز منتج جديد"
  message: string;
  userName: string;
  timestamp: string;       // ISO UTC
  isRead: boolean;
  // Reservation specific data
  productName?: string;
  quantity?: number;
  totalPrice?: number;
  currency?: string;
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
