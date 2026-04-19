import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { VehicleAdditionRequestsService } from './admin/vehicle-addition-requests.service';
import { ToasterService } from '../../shared/components/toaster/toaster.service';
import {
  AppNotification,
  NotificationType,
  NotificationsResponse,
  UnreadCountResponse,
  ApiResponse,
  VehicleAdditionRequestDto
} from '../models';

// Storage key for localStorage persistence
const STORAGE_KEY = 'voltyks_notifications';
const SETTINGS_KEY = 'voltyks_notification_settings';
const READ_IDS_KEY = 'voltyks_notifications_read_ids';

export interface NotificationSettings {
  soundEnabled: boolean;
  showReports: boolean;
  showComplaints: boolean;
  showReservations: boolean;
  showVehicleRequests: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  showReports: true,
  showComplaints: true,
  showReservations: true,
  showVehicleRequests: true
};

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/notifications`;
  private readonly hubUrl = `${environment.apiBaseUrl}/hubs/notification`;

  private hubConnection: signalR.HubConnection | null = null;
  private isConnected = false;
  private notificationSound: HTMLAudioElement | null = null;
  private readNotificationIds: Set<string> = new Set();

  // Track processed notification IDs to prevent duplicates
  private processedNotificationIds: Set<string> = new Set();

  // Queue for processing notifications sequentially
  private notificationQueue: Subject<AppNotification> = new Subject();
  private isProcessingQueue = false;

  // Flag to track if SignalR listeners are registered
  private listenersRegistered = false;

  // Auto-reconnect interval
  private reconnectInterval: any = null;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  // Polling fallback interval (when SignalR fails)
  private pollingInterval: any = null;
  private readonly POLLING_DELAY = 5000; // 5 seconds - fast polling for real-time feel
  private readonly MAX_POLLING_DELAY = 60000; // 60 seconds max backoff
  private currentPollingDelay = 5000; // Current polling delay (increases on rate limit)
  private isRateLimited = false; // Flag to track rate limit status
  private rateLimitResetTimeout: any = null;

  // Dedicated polling for vehicle-addition requests (backend has no SignalR event for them).
  // Cheap 10s poll of totalCount; full fetch only fires when the count changes.
  private vehiclePollingInterval: any = null;
  private readonly VEHICLE_POLLING_DELAY = 10000; // 10 seconds
  private lastVehicleRequestsTotal: number | null = null;

  // Notifications state
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Unread count state
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // Connection state
  private connectionStateSubject = new BehaviorSubject<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
  public connectionState$ = this.connectionStateSubject.asObservable();

  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Error state
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  // Settings
  private settingsSubject = new BehaviorSubject<NotificationSettings>(DEFAULT_SETTINGS);
  public settings$ = this.settingsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private vehicleRequestsService: VehicleAdditionRequestsService,
    private toasterService: ToasterService,
    private ngZone: NgZone
  ) {
    this.cleanupStorage(); // Clean old/corrupted data first
    this.loadReadIds();
    this.loadFromStorage();
    this.loadSettings();
    this.initNotificationSound();
    this.setupNotificationQueue();
  }

  /**
   * Cleanup corrupted or duplicate data from localStorage
   */
  private cleanupStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          const seenIds = new Set<string>();
          const seenKeys = new Set<string>();
          let hasIssues = false;

          const cleaned = data.filter((n: any, index: number) => {
            // Check for invalid ID
            if (!n.id || n.id === '' || n.id.endsWith('_')) {
              hasIssues = true;
              n.id = `${n.type || 'notification'}_${n.originalId || Date.now()}_${index}`;
            }

            // Check for duplicate ID
            if (seenIds.has(n.id)) {
              hasIssues = true;
              return false;
            }
            seenIds.add(n.id);

            // Check for duplicate content
            const contentKey = `${n.type}_${n.originalId}_${n.userName}_${(n.message || '').substring(0, 30)}`;
            if (seenKeys.has(contentKey)) {
              hasIssues = true;
              return false;
            }
            seenKeys.add(contentKey);

            return true;
          });

          // Save cleaned data if issues were found
          if (hasIssues) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            console.log('Notification storage cleaned:', data.length - cleaned.length, 'duplicates removed');
          }
        }
      }
    } catch (e) {
      // If storage is corrupted, clear it
      localStorage.removeItem(STORAGE_KEY);
      console.warn('Notification storage was corrupted and has been cleared');
    }
  }

  /**
   * Setup notification queue to process notifications sequentially
   * This prevents race conditions when multiple notifications arrive simultaneously
   */
  private setupNotificationQueue(): void {
    this.notificationQueue.subscribe(notification => {
      this.processNotificationInQueue(notification);
    });
  }

  /**
   * Process a notification from the queue
   */
  private processNotificationInQueue(notification: AppNotification): void {
    // Generate a unique key for this notification
    const notificationKey = this.generateNotificationKey(notification);

    // Check if already processed (prevent duplicates from reconnect/parallel events)
    if (this.processedNotificationIds.has(notificationKey)) {
      return;
    }

    // Check if exists in current notifications
    const current = this.notificationsSubject.value;
    const exists = current.some(n => n.id === notification.id || this.generateNotificationKey(n) === notificationKey);
    if (exists) {
      this.processedNotificationIds.add(notificationKey);
      return;
    }

    // Mark as processed
    this.processedNotificationIds.add(notificationKey);

    // Keep processed IDs set from growing too large
    if (this.processedNotificationIds.size > 1000) {
      const idsArray = Array.from(this.processedNotificationIds);
      this.processedNotificationIds = new Set(idsArray.slice(-500));
    }

    // Add to beginning of list
    const updated = [notification, ...current];

    // Keep only last 100 notifications
    if (updated.length > 100) {
      updated.splice(100);
    }

    this.notificationsSubject.next(updated);
    this.saveToStorage();

    // Recalculate unread count from state (not increment)
    this.recalculateUnreadCount();

    // Play sound - run inside zone to ensure it works
    this.ngZone.run(() => {
      this.playSound();
    });

    // Show toast - MUST run inside Angular zone
    this.ngZone.run(() => {
      this.showNotificationToast(notification);
    });
  }

  /**
   * Generate a unique key for a notification based on its content
   * This helps identify duplicates even with different IDs
   */
  private generateNotificationKey(notification: AppNotification): string {
    return `${notification.type}_${notification.originalId || ''}_${notification.userName}_${notification.message?.substring(0, 50) || ''}`;
  }

  /**
   * Recalculate unread count from current state
   * This is the ONLY way to update the count - no increments/decrements
   */
  private recalculateUnreadCount(): void {
    const notifications = this.notificationsSubject.value;
    const count = notifications.filter(n => !n.isRead && !this.isMarkedAsRead(n)).length;
    this.unreadCountSubject.next(count);
  }

  /**
   * Initialize notification sound
   * Uses a base64 encoded short beep sound to avoid 404 errors
   */
  private initNotificationSound(): void {
    try {
      // Base64 encoded short notification beep (avoids 404 for missing file)
      const beepSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVB/cJh0WGN5hZV7bHZ9jJeMdWxwf4SDgH14fYKFg353eX2Ag4B8eXl8f4B+fHp7fX9+fXt7fH1+fXx7e3x9fX18fHx8fX19fHx8fH19fXx8fHx9fX18fHx8fX19fHx8fH19fXx8fHx9fX18fHx8fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8';
      this.notificationSound = new Audio(beepSound);
      this.notificationSound.volume = 0.3;
    } catch (e) {
      // Sound not available - fail silently
      this.notificationSound = null;
    }
  }

  /**
   * Play notification sound if enabled
   */
  private playSound(): void {
    const settings = this.settingsSubject.value;
    if (settings.soundEnabled && this.notificationSound) {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(() => {});
    }
  }

  /**
   * Load notifications from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          // Deduplicate notifications by ID
          const seenIds = new Set<string>();
          const deduplicated = data.filter((n: AppNotification, index: number) => {
            // Ensure valid ID
            if (!n.id || n.id === '' || n.id.endsWith('_')) {
              n.id = `${n.type || 'notification'}_stored_${index}`;
            }
            if (seenIds.has(n.id)) {
              return false; // Skip duplicate
            }
            seenIds.add(n.id);
            return true;
          });
          this.notificationsSubject.next(deduplicated);
          this.updateUnreadCount();
        }
      }
    } catch (e) {
      // Invalid storage data
    }
  }

  /**
   * Save notifications to localStorage
   */
  private saveToStorage(): void {
    try {
      const notifications = this.notificationsSubject.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 100)));
    } catch (e) {
      // Storage full or unavailable
    }
  }

  /**
   * Load read notification IDs from localStorage
   */
  private loadReadIds(): void {
    try {
      const stored = localStorage.getItem(READ_IDS_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          // Strip legacy un-namespaced "original_<id>" entries — they used to cause
          // cross-type id collisions (e.g. complaint_12 marking vehicle-request_12 as read).
          // Full-id entries like "complaint_12" stay, so read status is preserved where it matters.
          const migrated = ids.filter(id => typeof id === 'string' && !/^original_\d+$/.test(id));
          this.readNotificationIds = new Set(migrated);
          if (migrated.length !== ids.length) {
            this.saveReadIds();
          }
        }
      }
    } catch (e) {
      // Invalid storage data
    }
  }

  /**
   * Save read notification IDs to localStorage
   */
  private saveReadIds(): void {
    try {
      // Keep only last 500 read IDs to prevent storage overflow
      const idsArray = Array.from(this.readNotificationIds).slice(-500);
      localStorage.setItem(READ_IDS_KEY, JSON.stringify(idsArray));
    } catch (e) {
      // Storage full or unavailable
    }
  }

  /**
   * Mark notification ID as read in persistent storage.
   * The `original_<id>` fallback is type-namespaced to avoid collisions
   * between different notification types that happen to share the same numeric id
   * (e.g. complaint_12 and vehicle-request_12).
   */
  private persistReadStatus(notification: AppNotification): void {
    this.readNotificationIds.add(notification.id);
    if (notification.originalId !== undefined && notification.originalId !== null) {
      this.readNotificationIds.add(`${notification.type}_original_${notification.originalId}`);
    }
    this.saveReadIds();
  }

  /**
   * Check if notification is marked as read in persistent storage.
   * Looks up both the full id and the type-namespaced originalId fallback.
   */
  private isMarkedAsRead(notification: AppNotification): boolean {
    if (this.readNotificationIds.has(notification.id)) {
      return true;
    }
    if (notification.originalId !== undefined && notification.originalId !== null) {
      return this.readNotificationIds.has(`${notification.type}_original_${notification.originalId}`);
    }
    return false;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        this.settingsSubject.next({ ...DEFAULT_SETTINGS, ...settings });
      }
    } catch (e) {
      // Invalid settings
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings(settings: Partial<NotificationSettings>): void {
    const current = this.settingsSubject.value;
    const updated = { ...current, ...settings };
    this.settingsSubject.next(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      // Storage unavailable
    }
  }

  /**
   * Get current settings
   */
  get settings(): NotificationSettings {
    return this.settingsSubject.value;
  }

  /**
   * Update unread count from notifications
   * Always recalculates from state - never increment/decrement
   */
  private updateUnreadCount(): void {
    this.recalculateUnreadCount();
  }

  /**
   * Connect to SignalR Hub with auto-reconnect and polling fallback
   */
  connect(): void {
    // Clear any existing intervals
    this.clearIntervals();

    // Check if SignalR is enabled in environment
    if (!environment.enableSignalR) {
      // Use polling fallback only
      this.startPolling();
      this.loadNotifications(); // This recalculates unread count from local state
      return;
    }

    // Prevent multiple connections
    if (this.isConnected && this.hubConnection) {
      return;
    }

    // If hub exists but not connected, disconnect first
    if (this.hubConnection && !this.isConnected) {
      this.disconnectHub();
    }

    const token = this.authService.getToken();
    if (!token) {
      // Start polling as fallback
      this.startPolling();
      return;
    }

    this.ngZone.run(() => {
      this.connectionStateSubject.next('connecting');
    });

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    // Setup event listeners ONLY if not already registered
    if (!this.listenersRegistered) {
      this.setupEventListeners();
      this.listenersRegistered = true;
    }

    // Start connection
    this.hubConnection
      .start()
      .then(() => {
        this.ngZone.run(() => {
          this.isConnected = true;
          this.connectionStateSubject.next('connected');
          this.errorSubject.next(null);
        });
        // Stop polling when SignalR is connected - SignalR handles real-time updates
        this.stopPolling();
        // Join broadcast group for admin notifications
        this.joinBroadcastGroup();
        // Load initial notifications after connection (this recalculates unread count)
        this.loadNotifications();
        // Always poll vehicle requests — backend has no SignalR event for them yet
        this.startVehiclePolling();
        console.log('SignalR connected - polling stopped to reduce server load');
      })
      .catch((err) => {
        console.error('SignalR connection failed:', err);
        this.ngZone.run(() => {
          this.isConnected = false;
          this.connectionStateSubject.next('error');
          this.errorSubject.next('فشل الاتصال بخادم الإشعارات - جاري استخدام التحديث الدوري');
        });
        // Start polling as fallback
        this.startPolling();
        // Also start dedicated vehicle-request polling
        this.startVehiclePolling();
        // Load notifications via REST API (this recalculates unread count)
        this.loadNotifications();
        // Schedule reconnect attempt
        this.scheduleReconnect();
      });

    // Handle reconnection events
    this.hubConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      this.ngZone.run(() => {
        this.connectionStateSubject.next('connecting');
      });
      // Start polling during reconnection
      this.startPolling();
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      this.ngZone.run(() => {
        this.isConnected = true;
        this.connectionStateSubject.next('connected');
        this.errorSubject.next(null);
      });
      // Stop polling when SignalR reconnects - SignalR handles real-time updates
      this.stopPolling();
      // Clear reconnect interval
      this.clearReconnectInterval();
      // Rejoin broadcast group after reconnection
      this.joinBroadcastGroup();
      // Refresh notifications after reconnection (this recalculates unread count)
      setTimeout(() => {
        this.loadNotifications();
      }, 1000);
    });

    this.hubConnection.onclose((error) => {
      console.log('SignalR connection closed:', error);
      this.ngZone.run(() => {
        this.isConnected = false;
        this.connectionStateSubject.next('disconnected');
      });
      // Start polling as fallback
      this.startPolling();
      // Schedule reconnect attempt
      this.scheduleReconnect();
    });
  }

  /**
   * Start polling for notifications (fallback when SignalR is unavailable)
   * Uses dynamic delay that increases on rate limit errors
   * IMPORTANT: Only polls when SignalR is NOT connected to reduce server load
   */
  private startPolling(): void {
    // Don't start polling if SignalR is connected - SignalR handles real-time updates
    if (this.isConnected) {
      console.log('SignalR connected - skipping polling to reduce server load');
      return;
    }

    if (this.pollingInterval) return; // Already polling

    console.log(`Starting notification polling (delay: ${this.currentPollingDelay}ms)...`);
    this.scheduleNextPoll();
  }

  /**
   * Schedule next poll with current delay
   * Uses setTimeout for dynamic delay control (not fixed setInterval)
   */
  private scheduleNextPoll(): void {
    // Clear any existing timeout
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
    }

    this.pollingInterval = setTimeout(() => {
      this.loadNotifications();
      // Schedule next poll after this one completes
      this.scheduleNextPoll();
    }, this.currentPollingDelay);
  }

  /**
   * Handle rate limit - increase polling delay exponentially
   */
  private handleRateLimit(): void {
    if (!this.isRateLimited) {
      this.isRateLimited = true;
      console.warn('Rate limited - increasing polling delay');
    }

    // Increase delay exponentially (double it), max 60 seconds
    this.currentPollingDelay = Math.min(this.currentPollingDelay * 2, this.MAX_POLLING_DELAY);
    console.log(`New polling delay: ${this.currentPollingDelay}ms`);

    // Clear rate limit reset timeout if exists
    if (this.rateLimitResetTimeout) {
      clearTimeout(this.rateLimitResetTimeout);
    }

    // Schedule reset of rate limit state after successful period
    this.rateLimitResetTimeout = setTimeout(() => {
      this.resetRateLimitState();
    }, this.MAX_POLLING_DELAY * 2); // Reset after 2 minutes of no rate limits
  }

  /**
   * Reset rate limit state - called after successful requests
   */
  private resetRateLimitState(): void {
    if (this.isRateLimited) {
      console.log('Rate limit cleared - resetting polling delay');
      this.isRateLimited = false;
      this.currentPollingDelay = this.POLLING_DELAY; // Reset to default 5s

      if (this.rateLimitResetTimeout) {
        clearTimeout(this.rateLimitResetTimeout);
        this.rateLimitResetTimeout = null;
      }
    }
  }

  /**
   * Stop polling for notifications
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      console.log('Stopping notification polling');
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    // Also clear rate limit reset timeout
    if (this.rateLimitResetTimeout) {
      clearTimeout(this.rateLimitResetTimeout);
      this.rateLimitResetTimeout = null;
    }
  }

  /**
   * Start dedicated polling for vehicle-addition requests.
   * Runs even when SignalR is connected, because the backend doesn't
   * emit a SignalR event for this type yet. Uses a cheap count-only
   * request and only triggers a full refresh when the count actually changes.
   */
  private startVehiclePolling(): void {
    if (this.vehiclePollingInterval) return;
    this.vehiclePollingInterval = setInterval(() => {
      this.checkVehicleRequestsForChanges();
    }, this.VEHICLE_POLLING_DELAY);
  }

  /**
   * Fetch only the totalCount (pageSize=1) and trigger a full refresh
   * if it has changed since the last check.
   */
  private checkVehicleRequestsForChanges(): void {
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) return;

    this.vehicleRequestsService.getAll(null, 1, 1).subscribe({
      next: (res) => {
        const count = res?.data?.totalCount;
        if (typeof count !== 'number') return;
        if (this.lastVehicleRequestsTotal === null || count !== this.lastVehicleRequestsTotal) {
          this.lastVehicleRequestsTotal = count;
          this.loadVehicleRequestNotifications();
        }
      },
      error: () => {
        // Silent fail — previous state remains
      }
    });
  }

  /**
   * Stop vehicle-request polling.
   */
  private stopVehiclePolling(): void {
    if (this.vehiclePollingInterval) {
      clearInterval(this.vehiclePollingInterval);
      this.vehiclePollingInterval = null;
    }
  }

  /**
   * Schedule a reconnect attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectInterval) return; // Already scheduled

    console.log('Scheduling SignalR reconnect...');
    this.reconnectInterval = setInterval(() => {
      if (!this.isConnected && this.authService.getToken()) {
        console.log('Attempting to reconnect SignalR...');
        this.connect();
      }
    }, this.RECONNECT_DELAY);
  }

  /**
   * Clear reconnect interval
   */
  private clearReconnectInterval(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Clear all intervals
   */
  private clearIntervals(): void {
    this.stopPolling();
    this.stopVehiclePolling();
    this.clearReconnectInterval();
  }

  /**
   * Disconnect hub only (without clearing intervals)
   */
  private disconnectHub(): void {
    if (this.hubConnection) {
      this.hubConnection.off('NewReport');
      this.hubConnection.off('NewComplaint');
      this.hubConnection.off('ReceiveBroadcast');
      this.hubConnection.off('NewReservation');
      this.hubConnection.off('NewVehicleAdditionRequest');
      this.hubConnection.off('ReceiveNotification');
      this.hubConnection.off('SendNotification');
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
      this.listenersRegistered = false;
    }
  }

  /**
   * Setup SignalR event listeners
   * Uses queue to prevent race conditions with parallel events
   */
  private setupEventListeners(): void {
    if (!this.hubConnection) return;

    console.log('[SignalR] Setting up event listeners...');

    // Listen for new reports
    this.hubConnection.on('NewReport', (notification: AppNotification) => {
      console.log('[SignalR] NewReport received:', notification);
      if (this.settings.showReports) {
        const enrichedNotification: AppNotification = {
          ...notification,
          id: notification.id || `report_${notification.originalId || Date.now()}`,
          type: 'report',
          isRead: false,
          timestamp: notification.timestamp || new Date().toISOString()
        };
        // Queue the notification for sequential processing
        this.notificationQueue.next(enrichedNotification);
      }
    });

    // Listen for new complaints
    this.hubConnection.on('NewComplaint', (notification: AppNotification) => {
      console.log('[SignalR] ✅ NewComplaint received:', notification);
      console.log('[SignalR] showComplaints setting:', this.settings.showComplaints);
      if (this.settings.showComplaints) {
        const enrichedNotification: AppNotification = {
          ...notification,
          id: notification.id || `complaint_${notification.originalId || Date.now()}`,
          type: 'complaint',
          message: notification.message || `شكوى جديدة من ${notification.userName || 'مستخدم'}`,
          isRead: false,
          timestamp: notification.timestamp || new Date().toISOString()
        };
        console.log('[SignalR] Enriched complaint notification:', enrichedNotification);
        // Queue the notification for sequential processing
        this.notificationQueue.next(enrichedNotification);
      } else {
        console.log('[SignalR] ⚠️ Complaint ignored - showComplaints is disabled');
      }
    });

    // Listen for broadcast notifications (can be any type)
    this.hubConnection.on('ReceiveBroadcast', (title: string, body: string, data: any) => {
      console.log('[SignalR] ReceiveBroadcast received:', { title, body, data });

      // Detect notification type using robust logic
      const detectedType = this.detectNotificationType(title, body, data);

      // Generate appropriate message if backend sends inconsistent data
      const correctedMessage = this.generateConsistentMessage(detectedType, body, data);

      // Check if we should show this notification type
      const shouldShow = (detectedType === 'complaint' && this.settings.showComplaints) ||
                         (detectedType === 'report' && this.settings.showReports) ||
                         (detectedType === 'reservation' && this.settings.showReservations) ||
                         (detectedType === 'vehicle-request' && this.settings.showVehicleRequests);

      if (shouldShow) {
        const notification: AppNotification = {
          id: data?.id || `${detectedType}_${data?.originalId || Date.now()}`,
          type: detectedType,
          originalId: data?.originalId || data?.id,
          title: title,
          message: correctedMessage,
          userName: data?.userName || data?.userFullName || 'مستخدم',
          timestamp: data?.timestamp || data?.createdAt || new Date().toISOString(),
          isRead: false,
          // Only include product data for reservations
          productName: detectedType === 'reservation' ? data?.productName : undefined,
          quantity: detectedType === 'reservation' ? data?.quantity : undefined,
          totalPrice: detectedType === 'reservation' ? data?.totalPrice : undefined,
          currency: detectedType === 'reservation' ? data?.currency : undefined,
          // Only include vehicle data for vehicle-requests
          brandName: detectedType === 'vehicle-request' ? data?.brandName : undefined,
          modelName: detectedType === 'vehicle-request' ? data?.modelName : undefined,
          capacity: detectedType === 'vehicle-request' ? data?.capacity : undefined
        };
        // Queue the notification for sequential processing
        this.notificationQueue.next(notification);
      }
    });

    // Listen for new reservation event (in case backend uses different event name)
    this.hubConnection.on('NewReservation', (notification: any) => {
      console.log('[SignalR] NewReservation received:', notification);
      if (this.settings.showReservations) {
        const enrichedNotification: AppNotification = {
          ...notification,
          id: notification.id || `reservation_${notification.originalId || Date.now()}`,
          type: 'reservation',
          isRead: false,
          timestamp: notification.timestamp || new Date().toISOString()
        };
        this.notificationQueue.next(enrichedNotification);
      }
    });

    // Listen for new vehicle addition request event
    this.hubConnection.on('NewVehicleAdditionRequest', (notification: any) => {
      console.log('[SignalR] NewVehicleAdditionRequest received:', notification);
      if (this.settings.showVehicleRequests) {
        const brandName = notification.brandName || notification.BrandName;
        const modelName = notification.modelName || notification.ModelName;
        const capacity = notification.capacity || notification.Capacity;
        const userName = notification.userName || notification.userFullName || 'مستخدم';
        const enrichedNotification: AppNotification = {
          ...notification,
          id: notification.id || `vehicle-request_${notification.originalId || Date.now()}`,
          type: 'vehicle-request',
          title: notification.title || 'طلب إضافة سيارة',
          message: notification.message
            || (brandName && modelName
                ? `طلب إضافة السيارة "${brandName} ${modelName}" من ${userName}`
                : `طلب إضافة سيارة جديد من ${userName}`),
          userName,
          brandName,
          modelName,
          capacity,
          isRead: false,
          timestamp: notification.timestamp || notification.createdAt || new Date().toISOString()
        };
        this.notificationQueue.next(enrichedNotification);
      }
    });

    // Listen for generic notification event
    this.hubConnection.on('ReceiveNotification', (notification: any) => {
      console.log('[SignalR] ReceiveNotification received:', notification);
      const type = this.detectNotificationType(
        notification.title || '',
        notification.message || notification.body || '',
        notification
      );
      const correctedMessage = this.generateConsistentMessage(
        type,
        notification.message || notification.body || '',
        notification
      );

      const enrichedNotification: AppNotification = {
        ...notification,
        id: notification.id || `${type}_${notification.originalId || Date.now()}`,
        type: type,
        message: correctedMessage,
        isRead: false,
        timestamp: notification.timestamp || new Date().toISOString(),
        // Only include product data for reservations
        productName: type === 'reservation' ? notification.productName : undefined,
        quantity: type === 'reservation' ? notification.quantity : undefined,
        totalPrice: type === 'reservation' ? notification.totalPrice : undefined,
        // Only include vehicle data for vehicle-requests
        brandName: type === 'vehicle-request' ? notification.brandName : undefined,
        modelName: type === 'vehicle-request' ? notification.modelName : undefined,
        capacity: type === 'vehicle-request' ? notification.capacity : undefined
      };

      // Check if we should show this type
      if ((type === 'report' && this.settings.showReports) ||
          (type === 'complaint' && this.settings.showComplaints) ||
          (type === 'reservation' && this.settings.showReservations) ||
          (type === 'vehicle-request' && this.settings.showVehicleRequests)) {
        this.notificationQueue.next(enrichedNotification);
      }
    });

    // Listen for any other possible event names the backend might use
    this.hubConnection.on('SendNotification', (notification: any) => {
      console.log('[SignalR] SendNotification received:', notification);
      const type = this.detectNotificationType(
        notification.title || '',
        notification.message || notification.body || '',
        notification
      );
      const correctedMessage = this.generateConsistentMessage(
        type,
        notification.message || notification.body || '',
        notification
      );

      const enrichedNotification: AppNotification = {
        ...notification,
        id: notification.id || `${type}_${notification.originalId || Date.now()}`,
        type: type,
        message: correctedMessage,
        isRead: false,
        timestamp: notification.timestamp || new Date().toISOString(),
        productName: type === 'reservation' ? notification.productName : undefined,
        quantity: type === 'reservation' ? notification.quantity : undefined,
        totalPrice: type === 'reservation' ? notification.totalPrice : undefined,
        brandName: type === 'vehicle-request' ? notification.brandName : undefined,
        modelName: type === 'vehicle-request' ? notification.modelName : undefined,
        capacity: type === 'vehicle-request' ? notification.capacity : undefined
      };

      if ((type === 'report' && this.settings.showReports) ||
          (type === 'complaint' && this.settings.showComplaints) ||
          (type === 'reservation' && this.settings.showReservations) ||
          (type === 'vehicle-request' && this.settings.showVehicleRequests)) {
        this.notificationQueue.next(enrichedNotification);
      }
    });

    console.log('[SignalR] Event listeners registered for: NewReport, NewComplaint, ReceiveBroadcast, NewReservation, NewVehicleAdditionRequest, ReceiveNotification, SendNotification');
  }

  /**
   * Join broadcast group for admin notifications
   */
  private joinBroadcastGroup(): void {
    if (!this.hubConnection || !this.isConnected) return;

    this.hubConnection.invoke('JoinBroadcastGroup')
      .catch(() => {
        // Silently fail - broadcast notifications will still come through for admins
      });
  }

  /**
   * Disconnect from SignalR Hub and stop all intervals
   */
  disconnect(): void {
    // Clear all intervals
    this.clearIntervals();

    if (this.hubConnection) {
      // Remove all listeners before stopping
      this.hubConnection.off('NewReport');
      this.hubConnection.off('NewComplaint');
      this.hubConnection.off('ReceiveBroadcast');
      this.hubConnection.off('NewReservation');
      this.hubConnection.off('ReceiveNotification');
      this.hubConnection.off('SendNotification');

      this.hubConnection
        .stop()
        .then(() => {
          this.ngZone.run(() => {
            this.isConnected = false;
            this.connectionStateSubject.next('disconnected');
          });
        })
        .catch(() => {});

      this.hubConnection = null;
      this.listenersRegistered = false;
    }
  }

  /**
   * Add new notification to the list
   * Routes through the queue for safe processing
   */
  private addNotification(notification: AppNotification): void {
    // Route through queue for consistent processing
    this.notificationQueue.next(notification);
  }

  /**
   * Show toast for new notification
   */
  private showNotificationToast(notification: AppNotification): void {
    let toastType: 'info' | 'warning' | 'success' | 'error' = 'info';
    let icon = '📢';
    let title = 'إشعار جديد';

    switch (notification.type) {
      case 'report':
        toastType = 'warning';
        icon = '🚨';
        title = 'بلاغ جديد';
        break;
      case 'complaint':
        toastType = 'info';
        icon = '📢';
        title = 'شكوى جديدة';
        break;
      case 'reservation':
        toastType = 'success';
        icon = '🛒';
        title = 'حجز منتج جديد';
        break;
    }

    // Build detailed message
    let toastMessage = `${icon} ${title}`;
    toastMessage += ` • ${notification.userName}`;

    if (notification.message) {
      const shortMessage = notification.message.length > 50
        ? notification.message.substring(0, 50) + '...'
        : notification.message;
      toastMessage += ` - ${shortMessage}`;
    }

    // Add reservation-specific details
    if (notification.type === 'reservation' && notification.productName) {
      toastMessage += ` | ${notification.productName}`;
      if (notification.totalPrice) {
        toastMessage += ` (${notification.totalPrice.toLocaleString()} ${notification.currency || 'ج.م'})`;
      }
    }

    this.toasterService.show(toastType, toastMessage, 8000);
  }

  /**
   * Load notifications from REST API
   */
  loadNotifications(page = 1, pageSize = 50, onlyUnread = false): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    let url = `${this.baseUrl}?page=${page}&pageSize=${pageSize}`;
    if (onlyUnread) {
      url += '&onlyUnread=true';
    }

    this.http.get<NotificationsResponse>(url).pipe(
      catchError(err => {
        // Handle rate limit error specifically
        if (err.status === 429) {
          this.handleRateLimit();
          // Don't show error to user for rate limit - just silently back off
          this.loadingSubject.next(false);
          return of(null);
        }

        this.errorSubject.next('فشل تحميل الإشعارات');
        this.loadingSubject.next(false);
        return of(null);
      })
    ).subscribe({
      next: response => {
        // Successful request - reset rate limit state if it was active
        if (response !== null) {
          this.resetRateLimitState();
        }

        if (response?.status && response.data) {
          const seenIds = new Set<string>();

          // Map and normalize notification types, preserving local isRead status
          const normalizedNotifications = response.data.map((n, index) => {
            const type = this.normalizeNotificationType(n);

            // Ensure unique ID - use originalId, or generate one based on index/timestamp
            let uniqueId = n.id;
            if (!uniqueId || uniqueId === '' || seenIds.has(uniqueId)) {
              // Generate unique ID if missing or duplicate
              const hasValidOriginalId = n.originalId !== undefined && n.originalId !== null;
              const baseId = hasValidOriginalId
                ? `${type}_${n.originalId}`
                : `${type}_${Date.now()}_${index}`;
              uniqueId = baseId;
            }

            // Handle case where ID format is "type_" without number
            if (uniqueId.endsWith('_') || seenIds.has(uniqueId)) {
              uniqueId = `${uniqueId}${Date.now()}_${index}`;
            }

            seenIds.add(uniqueId);

            const normalized: AppNotification = {
              ...n,
              id: uniqueId,
              type: type
            };

            // Check if this notification was marked as read in persistent storage
            // This ensures read status persists even if API returns isRead: false
            if (!normalized.isRead && this.isMarkedAsRead(normalized)) {
              normalized.isRead = true;
            }

            return normalized;
          });

          this.notificationsSubject.next(normalizedNotifications);
          this.saveToStorage();
          this.updateUnreadCount();
        }
        this.loadingSubject.next(false);

        // Also fetch vehicle-addition requests and merge them as notifications,
        // since the backend's notifications table doesn't include this type yet.
        this.loadVehicleRequestNotifications();
      }
    });
  }

  /**
   * Fetch recent vehicle-addition requests and merge them as notifications.
   * Called after loadNotifications() so they appear alongside reports/complaints/reservations.
   * Pending requests show as unread; processed ones show as read.
   */
  loadVehicleRequestNotifications(): void {
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) return;

    this.vehicleRequestsService.getAll(null, 1, 50).subscribe({
      next: (res) => {
        if (!res?.status || !res.data?.items) return;

        const vehicleNotifications: AppNotification[] = res.data.items.map(req =>
          this.vehicleRequestToNotification(req)
        );

        // Merge: keep all non-vehicle-request notifications, replace vehicle-request ones
        const current = this.notificationsSubject.value;
        const others = current.filter(n => n.type !== 'vehicle-request');
        const combined = [...others, ...vehicleNotifications]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        this.notificationsSubject.next(combined);
        this.saveToStorage();
        this.updateUnreadCount();
        this.lastVehicleRequestsTotal = res.data.totalCount ?? vehicleNotifications.length;
      },
      error: () => {
        // Silent fail — existing notifications remain
      }
    });
  }

  /**
   * Convert a vehicle-addition-request DTO into an AppNotification.
   */
  private vehicleRequestToNotification(req: VehicleAdditionRequestDto): AppNotification {
    const id = `vehicle-request_${req.id}`;
    const message = `طلب إضافة السيارة "${req.brandName} ${req.modelName}" من ${req.userFullName}`;

    const notification: AppNotification = {
      id,
      type: 'vehicle-request',
      originalId: req.id,
      title: 'طلب إضافة سيارة',
      message,
      userName: req.userFullName,
      timestamp: req.createdAt,
      // Processed requests are treated as read; pending ones are unread
      isRead: req.status !== 'pending',
      brandName: req.brandName,
      modelName: req.modelName,
      capacity: req.capacity
    };

    // Honor localStorage read status (user may have manually marked a pending one as read)
    if (!notification.isRead && this.isMarkedAsRead(notification)) {
      notification.isRead = true;
    }

    return notification;
  }

  /**
   * Normalize notification type from API response
   * PRIORITY: API type > Title/Message keywords > Fields > Default
   */
  private normalizeNotificationType(notification: any): NotificationType {
    const message = notification?.message || '';
    const title = notification?.title || '';
    const combinedText = `${message} ${title}`.toLowerCase();

    // PRIORITY 1: Check type field from API FIRST (most reliable)
    const type = (notification?.type || '').toString().toLowerCase().trim();
    if (type === 'complaint' || type === 'complaints') {
      return 'complaint';
    }
    if (type === 'report' || type === 'reports') {
      return 'report';
    }
    if (type === 'reservation' || type === 'reservations' || type === 'product_reservation') {
      return 'reservation';
    }
    if (type === 'vehicle-request' || type === 'vehicle_request' ||
        type === 'vehiclerequest' || type === 'vehicle-addition-request' ||
        type === 'vehicleadditionrequest') {
      return 'vehicle-request';
    }

    // PRIORITY 2: Check notification ID format
    const id = (notification?.id || '').toString().toLowerCase();
    if (id.startsWith('complaint_') || id.includes('complaint')) return 'complaint';
    if (id.startsWith('report_') || id.includes('report')) return 'report';
    if (id.startsWith('reservation_') || id.includes('reservation')) return 'reservation';
    if (id.startsWith('vehicle-request_') || id.includes('vehicle-request')) return 'vehicle-request';

    // PRIORITY 3: Check message/title content
    // Complaint keywords (Arabic) - check FIRST
    if (combinedText.includes('شكوى') || combinedText.includes('شكوي') ||
        combinedText.includes('complaint')) {
      return 'complaint';
    }

    // Report keywords
    if (combinedText.includes('بلاغ') || combinedText.includes('report')) {
      return 'report';
    }

    // Reservation keywords - must have specific product-related terms
    if ((combinedText.includes('حجز') && combinedText.includes('منتج')) ||
        combinedText.includes('حجز منتج') ||
        combinedText.includes('reservation') ||
        (combinedText.includes('product') && combinedText.includes('reserved'))) {
      return 'reservation';
    }

    // PRIORITY 4: Check reservation-specific fields (only if has product data)
    if ((notification?.productName || notification?.product_name) &&
        (notification?.quantity !== undefined || notification?.totalPrice !== undefined)) {
      return 'reservation';
    }

    // Default based on source
    if (notification?.categoryName || notification?.category_name) {
      return 'complaint';
    }

    // Final default to complaint
    return 'complaint';
  }

  /**
   * Detect notification type with robust logic
   * PRIORITY: 1. Explicit type field, 2. Title keywords, 3. Data fields, 4. Body keywords
   */
  private detectNotificationType(title: string, body: string, data: any): NotificationType {
    const titleLower = (title || '').toLowerCase();
    const bodyLower = (body || '').toLowerCase();
    const dataType = (data?.type || '').toString().toLowerCase().trim();

    // PRIORITY 1: Check explicit type field from data
    if (dataType === 'complaint' || dataType === 'complaints') return 'complaint';
    if (dataType === 'report' || dataType === 'reports') return 'report';
    if (dataType === 'reservation' || dataType === 'reservations') return 'reservation';
    if (dataType === 'vehicle-request' || dataType === 'vehicle_request' ||
        dataType === 'vehiclerequest' || dataType === 'vehicle-addition-request' ||
        dataType === 'vehicleadditionrequest') return 'vehicle-request';

    // PRIORITY 2: Check TITLE for type keywords (most reliable indicator)
    // Title usually contains the notification type explicitly
    if (titleLower.includes('شكوى') || titleLower.includes('شكوي') || titleLower === 'complaint') {
      return 'complaint';
    }
    if (titleLower.includes('بلاغ') || titleLower === 'report') {
      return 'report';
    }
    if (titleLower.includes('حجز') || titleLower.includes('reservation')) {
      return 'reservation';
    }
    if (titleLower.includes('سيارة') || titleLower.includes('مركبة') ||
        titleLower.includes('vehicle')) {
      return 'vehicle-request';
    }

    // PRIORITY 3: Check data fields that indicate type
    // Complaints usually have categoryId/categoryName
    if (data?.categoryId || data?.categoryName || data?.complaintContent) {
      return 'complaint';
    }
    // Reports have reportContent
    if (data?.reportContent) {
      return 'report';
    }
    // Reservations have product-related data
    if (data?.productName || data?.productId || (data?.quantity !== undefined && data?.totalPrice !== undefined)) {
      return 'reservation';
    }
    // Vehicle-requests have brand/model/capacity combo
    if (data?.brandName && data?.modelName) {
      return 'vehicle-request';
    }

    // PRIORITY 4: Check body keywords as last resort
    // Note: Body might contain misleading content, so this is lowest priority
    if (bodyLower.includes('شكوى') && !bodyLower.includes('حجز')) {
      return 'complaint';
    }
    if (bodyLower.includes('بلاغ') && !bodyLower.includes('حجز')) {
      return 'report';
    }
    if (bodyLower.includes('حجز') && bodyLower.includes('منتج')) {
      return 'reservation';
    }

    // Default based on what's most common
    return 'complaint';
  }

  /**
   * Generate consistent message based on notification type
   * Fixes backend sending wrong message content for a type
   */
  private generateConsistentMessage(type: NotificationType, originalBody: string, data: any): string {
    const bodyLower = (originalBody || '').toLowerCase();
    const userName = data?.userName || data?.userFullName || 'مستخدم';

    // Check if the message content matches the detected type
    const bodyHasReservationContent = bodyLower.includes('بحجز') || bodyLower.includes('الكمية') ||
                                       bodyLower.includes('reserved') || bodyLower.includes('quantity');
    const bodyHasComplaintContent = bodyLower.includes('شكوى') || bodyLower.includes('complaint');
    const bodyHasReportContent = bodyLower.includes('بلاغ') || bodyLower.includes('report');

    // If type is complaint but body has reservation content, generate correct message
    if (type === 'complaint' && bodyHasReservationContent && !bodyHasComplaintContent) {
      if (data?.content || data?.complaintContent) {
        return data.content || data.complaintContent;
      }
      return `قام ${userName} بتقديم شكوى جديدة`;
    }

    // If type is report but body has reservation content, generate correct message
    if (type === 'report' && bodyHasReservationContent && !bodyHasReportContent) {
      if (data?.reportContent) {
        return data.reportContent;
      }
      return `قام ${userName} بتقديم بلاغ جديد`;
    }

    // If type is reservation but body doesn't have reservation content, generate correct message
    if (type === 'reservation' && !bodyHasReservationContent) {
      const productName = data?.productName || 'منتج';
      const quantity = data?.quantity || 1;
      return `قام ${userName} بحجز ${productName} (الكمية: ${quantity})`;
    }

    // Vehicle-request: generate a clear message if missing
    if (type === 'vehicle-request' && (!originalBody || originalBody.trim().length === 0)) {
      const brandName = data?.brandName;
      const modelName = data?.modelName;
      if (brandName && modelName) {
        return `طلب إضافة السيارة "${brandName} ${modelName}" من ${userName}`;
      }
      return `طلب إضافة سيارة جديد من ${userName}`;
    }

    // Original body is fine
    return originalBody;
  }

  /**
   * Load unread count from REST API
   */
  loadUnreadCount(): void {
    this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: response => {
        if (response?.status) {
          this.unreadCountSubject.next(response.data);
        }
      }
    });
  }

  /**
   * Extract numeric API ID from notification
   */
  private extractApiId(notification: AppNotification): string | number {
    if (notification.originalId !== undefined && notification.originalId !== null) {
      return notification.originalId;
    }
    const match = notification.id.match(/_(\d+)$/);
    if (match) {
      return match[1];
    }
    return notification.id;
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): Observable<ApiResponse<void>> {
    const notification = this.notificationsSubject.value.find(n => n.id === id);
    const apiId = notification ? this.extractApiId(notification) : id;

    // Optimistic update
    if (notification && !notification.isRead) {
      const current = this.notificationsSubject.value;
      const updated = current.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      );
      this.notificationsSubject.next(updated);
      this.saveToStorage();
      this.updateUnreadCount();
      this.persistReadStatus(notification);
    }

    // Vehicle-request notifications are synthetic (no backend row) — skip API call
    if (notification?.type === 'vehicle-request') {
      return of({ status: true, message: 'Marked locally', data: undefined as any });
    }

    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${apiId}/read`, {}).pipe(
      tap(response => {
        // Local state already updated
      }),
      catchError(err => {
        // Don't revert - keep local state as read since it's persisted
        console.warn('Failed to sync read status with server');
        return of({ status: true, message: 'Synced locally', data: undefined as any });
      })
    );
  }

  /**
   * Mark notification as read with optimistic update
   * Uses persistent storage to ensure read status survives refresh/API failures
   */
  markAsReadOptimistic(id: string): void {
    const current = this.notificationsSubject.value;
    const notification = current.find(n => n.id === id);

    if (notification && !notification.isRead) {
      // Update local state immediately (optimistic)
      const updated = current.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      );
      this.notificationsSubject.next(updated);
      this.saveToStorage();
      this.updateUnreadCount();

      // Persist read status to localStorage (this survives even if API fails)
      this.persistReadStatus(notification);

      // Vehicle-request notifications are synthetic — don't hit the backend
      if (notification.type === 'vehicle-request') {
        return;
      }

      // Call API (fire and forget - local state is already persisted)
      const apiId = this.extractApiId(notification);
      this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${apiId}/read`, {}).subscribe({
        error: () => {
          // Don't revert - keep local state as read since it's persisted
          // The API might be temporarily unavailable
          console.warn('Failed to sync read status with server');
        }
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<ApiResponse<void>> {
    // Optimistic update - update local state immediately
    const current = this.notificationsSubject.value;
    const updated = current.map(n => ({ ...n, isRead: true }));
    this.notificationsSubject.next(updated);
    this.saveToStorage();

    // Persist all read statuses
    current.forEach(n => {
      if (!n.isRead) {
        this.persistReadStatus(n);
      }
    });

    // Recalculate count from state
    this.recalculateUnreadCount();

    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/mark-all-read`, {}).pipe(
      tap(response => {
        // Local state already updated, nothing more to do
      }),
      catchError(err => {
        // Don't revert - keep local state as read since it's persisted
        console.warn('Failed to sync mark-all-read with server');
        return of({ status: true, message: 'Synced locally', data: undefined as any });
      })
    );
  }

  /**
   * Delete notification (local only)
   */
  deleteNotification(id: string): void {
    const current = this.notificationsSubject.value;
    const notification = current.find(n => n.id === id);
    const updated = current.filter(n => n.id !== id);
    this.notificationsSubject.next(updated);
    this.saveToStorage();

    // Update unread count if deleted notification was unread
    if (notification && !notification.isRead) {
      this.updateUnreadCount();
    }
  }

  /**
   * Clear all notifications (local only)
   */
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
    this.saveToStorage();
    // Recalculate count from state (will be 0 since notifications is empty)
    this.recalculateUnreadCount();
    // Also clear processed IDs since notifications are cleared
    this.processedNotificationIds.clear();
  }

  /**
   * Refresh notifications from server
   */
  refresh(): void {
    // loadNotifications() also recalculates unread count from local state
    this.loadNotifications();
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

    if (diffSecs < 30) return 'الآن';
    if (diffSecs < 60) return `منذ ${diffSecs} ثانية`;
    if (diffMins === 1) return 'منذ دقيقة';
    if (diffMins === 2) return 'منذ دقيقتين';
    if (diffMins < 11) return `منذ ${diffMins} دقائق`;
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours === 2) return 'منذ ساعتين';
    if (diffHours < 11) return `منذ ${diffHours} ساعات`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return 'منذ أسبوع';
    if (diffWeeks === 2) return 'منذ أسبوعين';
    if (diffWeeks < 5) return `منذ ${diffWeeks} أسابيع`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return 'منذ شهر';
    if (diffMonths === 2) return 'منذ شهرين';
    if (diffMonths < 12) return `منذ ${diffMonths} أشهر`;

    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get date group label for notification
   */
  getDateGroup(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return 'هذا الأسبوع';
    if (diffDays < 30) return 'هذا الشهر';
    return 'أقدم';
  }

  /**
   * Get grouped notifications by date
   */
  getGroupedNotifications(notifications: AppNotification[]): Map<string, AppNotification[]> {
    const groups = new Map<string, AppNotification[]>();
    const order = ['اليوم', 'أمس', 'هذا الأسبوع', 'هذا الشهر', 'أقدم'];

    // Initialize groups in order
    order.forEach(key => groups.set(key, []));

    // Group notifications
    notifications.forEach(n => {
      const group = this.getDateGroup(n.timestamp);
      const existing = groups.get(group) || [];
      existing.push(n);
      groups.set(group, existing);
    });

    // Remove empty groups
    order.forEach(key => {
      if (groups.get(key)?.length === 0) {
        groups.delete(key);
      }
    });

    return groups;
  }

  get notificationsValue(): AppNotification[] {
    return this.notificationsSubject.value;
  }

  get unreadCountValue(): number {
    return this.unreadCountSubject.value;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
