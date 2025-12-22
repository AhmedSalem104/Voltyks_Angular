import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import {
  AppNotification,
  NotificationsResponse,
  UnreadCountResponse,
  ApiResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/notifications`;
  private readonly hubUrl = `${environment.apiBaseUrl}/hubs/notification`;

  private hubConnection: signalR.HubConnection | null = null;
  private isConnected = false;

  // Notifications state
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Unread count state
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // Connection state
  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toasterService: ToasterService
  ) {}

  /**
   * Connect to SignalR Hub
   */
  connect(): void {
    if (this.isConnected || this.hubConnection) {
      console.log('SignalR: Already connected or connecting');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('SignalR: No token available, skipping connection');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Setup event listeners
    this.setupEventListeners();

    // Start connection
    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR: Connected successfully');
        this.isConnected = true;
        this.connectionStateSubject.next(true);
        // Load initial notifications after connection
        this.loadNotifications();
        this.loadUnreadCount();
      })
      .catch(err => {
        console.error('SignalR: Connection failed', err);
        this.isConnected = false;
        this.connectionStateSubject.next(false);
        // Fallback: Load notifications via REST API
        this.loadNotifications();
        this.loadUnreadCount();
      });

    // Handle reconnection events
    this.hubConnection.onreconnecting(error => {
      console.log('SignalR: Reconnecting...', error);
      this.connectionStateSubject.next(false);
    });

    this.hubConnection.onreconnected(connectionId => {
      console.log('SignalR: Reconnected', connectionId);
      this.isConnected = true;
      this.connectionStateSubject.next(true);
      // Refresh notifications after reconnection
      this.loadNotifications();
      this.loadUnreadCount();
    });

    this.hubConnection.onclose(error => {
      console.log('SignalR: Connection closed', error);
      this.isConnected = false;
      this.connectionStateSubject.next(false);
    });
  }

  /**
   * Setup SignalR event listeners
   */
  private setupEventListeners(): void {
    if (!this.hubConnection) return;

    // Listen for new reports
    this.hubConnection.on('NewReport', (notification: AppNotification) => {
      console.log('SignalR: New Report received', notification);
      this.addNotification({
        ...notification,
        type: 'report',
        isRead: false
      });
    });

    // Listen for new complaints
    this.hubConnection.on('NewComplaint', (notification: AppNotification) => {
      console.log('SignalR: New Complaint received', notification);
      this.addNotification({
        ...notification,
        type: 'complaint',
        isRead: false
      });
    });
  }

  /**
   * Disconnect from SignalR Hub
   */
  disconnect(): void {
    if (this.hubConnection) {
      this.hubConnection
        .stop()
        .then(() => {
          console.log('SignalR: Disconnected');
          this.isConnected = false;
          this.connectionStateSubject.next(false);
        })
        .catch(err => console.error('SignalR: Disconnect error', err));

      this.hubConnection = null;
    }
  }

  /**
   * Add new notification to the list
   */
  private addNotification(notification: AppNotification): void {
    const current = this.notificationsSubject.value;

    // Check for duplicates
    const exists = current.some(n => n.id === notification.id);
    if (exists) return;

    // Add to beginning of list
    const updated = [notification, ...current];

    // Keep only last 50 notifications
    if (updated.length > 50) {
      updated.splice(50);
    }

    this.notificationsSubject.next(updated);

    // Update unread count
    if (!notification.isRead) {
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    }

    // Show toast notification with more details
    const toastType = notification.type === 'report' ? 'warning' : 'info';
    const icon = notification.type === 'report' ? '🚨' : '📢';
    const title = notification.type === 'report' ? 'بلاغ جديد' : 'شكوى جديدة';
    const message = `${icon} ${title}\n👤 ${notification.userName}`;
    this.toasterService.show(toastType, message, 6000);
  }

  /**
   * Load notifications from REST API
   */
  loadNotifications(page = 1, pageSize = 20, onlyUnread = false): void {
    let url = `${this.baseUrl}?page=${page}&pageSize=${pageSize}`;
    if (onlyUnread) {
      url += '&onlyUnread=true';
    }

    this.http.get<NotificationsResponse>(url).subscribe({
      next: response => {
        if (response.status && response.data) {
          this.notificationsSubject.next(response.data);
        }
      },
      error: err => {
        console.error('Failed to load notifications', err);
      }
    });
  }

  /**
   * Load unread count from REST API
   */
  loadUnreadCount(): void {
    this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`).subscribe({
      next: response => {
        if (response.status) {
          this.unreadCountSubject.next(response.data);
        }
      },
      error: err => {
        console.error('Failed to load unread count', err);
      }
    });
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(response => {
        if (response.status) {
          // Update local state
          const current = this.notificationsSubject.value;
          const updated = current.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          );
          this.notificationsSubject.next(updated);

          // Update unread count
          const newCount = Math.max(0, this.unreadCountSubject.value - 1);
          this.unreadCountSubject.next(newCount);
        }
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/mark-all-read`, {}).pipe(
      tap(response => {
        if (response.status) {
          // Update local state
          const current = this.notificationsSubject.value;
          const updated = current.map(n => ({ ...n, isRead: true }));
          this.notificationsSubject.next(updated);

          // Reset unread count
          this.unreadCountSubject.next(0);
        }
      })
    );
  }

  /**
   * Get relative time string (Arabic) with proper pluralization
   */
  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Just now
    if (diffSecs < 30) return 'الآن';

    // Seconds
    if (diffSecs < 60) return `منذ ${diffSecs} ثانية`;

    // Minutes
    if (diffMins === 1) return 'منذ دقيقة';
    if (diffMins === 2) return 'منذ دقيقتين';
    if (diffMins < 11) return `منذ ${diffMins} دقائق`;
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;

    // Hours
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours === 2) return 'منذ ساعتين';
    if (diffHours < 11) return `منذ ${diffHours} ساعات`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;

    // Days
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;

    // Weeks
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return 'منذ أسبوع';
    if (diffWeeks === 2) return 'منذ أسبوعين';
    if (diffWeeks < 5) return `منذ ${diffWeeks} أسابيع`;

    // Months
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return 'منذ شهر';
    if (diffMonths === 2) return 'منذ شهرين';
    if (diffMonths < 12) return `منذ ${diffMonths} أشهر`;

    // Full date for older notifications
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get current notifications value
   */
  get notificationsValue(): AppNotification[] {
    return this.notificationsSubject.value;
  }

  /**
   * Get current unread count value
   */
  get unreadCountValue(): number {
    return this.unreadCountSubject.value;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
