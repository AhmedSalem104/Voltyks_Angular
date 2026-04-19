// Notification Related DTOs

export type NotificationType = 'report' | 'complaint' | 'reservation' | 'vehicle-request';

export interface AppNotification {
  id: string;              // "report_123" or "complaint_456" or "reservation_789" or "vehicle-request_42"
  type: NotificationType;
  originalId: number;
  title: string;           // "بلاغ جديد" or "شكوى جديدة" or "حجز منتج جديد" or "طلب إضافة سيارة"
  message: string;
  userName: string;
  timestamp: string;       // ISO UTC
  isRead: boolean;
  // Reservation specific data
  productName?: string;
  quantity?: number;
  totalPrice?: number;
  currency?: string;
  // Vehicle-request specific data
  brandName?: string;
  modelName?: string;
  capacity?: string;
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
