import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService, NotificationSettings } from '../../../core/services/notification.service';
import { AppNotification, NotificationType } from '../../../core/models';

type FilterType = 'all' | 'unread' | 'reports' | 'complaints' | 'reservations' | 'vehicle-requests';
type ViewType = 'list' | 'settings';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './notification-dropdown.component.html',
  styleUrls: ['./notification-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  notifications: AppNotification[] = [];
  unreadCount: number = 0;
  activeFilter: FilterType = 'all';
  currentView: ViewType = 'list';
  connectionState: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
  isLoading: boolean = false;
  error: string | null = null;
  settings: NotificationSettings = {
    soundEnabled: true,
    showReports: true,
    showComplaints: true,
    showReservations: true,
    showVehicleRequests: true
  };

  // For grouped notifications
  groupedNotifications: Map<string, AppNotification[]> = new Map();

  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to notifications
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.updateGroupedNotifications();
        this.cdr.markForCheck();
      })
    );

    // Subscribe to unread count
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
        this.cdr.markForCheck();
      })
    );

    // Subscribe to connection state
    this.subscriptions.push(
      this.notificationService.connectionState$.subscribe(state => {
        this.connectionState = state;
        this.cdr.markForCheck();
      })
    );

    // Subscribe to loading state
    this.subscriptions.push(
      this.notificationService.loading$.subscribe(loading => {
        this.isLoading = loading;
        this.cdr.markForCheck();
      })
    );

    // Subscribe to error state
    this.subscriptions.push(
      this.notificationService.error$.subscribe(error => {
        this.error = error;
        this.cdr.markForCheck();
      })
    );

    // Subscribe to settings
    this.subscriptions.push(
      this.notificationService.settings$.subscribe(settings => {
        this.settings = settings;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Update grouped notifications based on current filter
   */
  private updateGroupedNotifications(): void {
    const filtered = this.filteredNotifications;
    this.groupedNotifications = this.notificationService.getGroupedNotifications(filtered);
  }

  /**
   * Get filtered notifications based on active filter
   * Also deduplicates to prevent NG0955 errors
   */
  get filteredNotifications(): AppNotification[] {
    let filtered = this.notifications;

    switch (this.activeFilter) {
      case 'unread':
        filtered = this.notifications.filter(n => !n.isRead);
        break;
      case 'reports':
        filtered = this.notifications.filter(n => n.type === 'report');
        break;
      case 'complaints':
        filtered = this.notifications.filter(n => n.type === 'complaint');
        break;
      case 'reservations':
        filtered = this.notifications.filter(n => n.type === 'reservation');
        break;
      case 'vehicle-requests':
        filtered = this.notifications.filter(n => n.type === 'vehicle-request');
        break;
    }

    // Deduplicate by ID to prevent NG0955 errors
    const seen = new Set<string>();
    return filtered.filter(n => {
      const key = n.id || `${n.type}_${n.originalId}_${n.timestamp}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Set active filter
   */
  setFilter(filter: FilterType): void {
    this.activeFilter = filter;
    this.updateGroupedNotifications();
    this.cdr.markForCheck();
  }

  /**
   * Check if there are unread notifications
   */
  get hasUnread(): boolean {
    return this.unreadCount > 0;
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Get count by filter type
   */
  getFilterCount(filter: FilterType): number {
    switch (filter) {
      case 'unread':
        return this.notifications.filter(n => !n.isRead).length;
      case 'reports':
        return this.notifications.filter(n => n.type === 'report').length;
      case 'complaints':
        return this.notifications.filter(n => n.type === 'complaint').length;
      case 'reservations':
        return this.notifications.filter(n => n.type === 'reservation').length;
      case 'vehicle-requests':
        return this.notifications.filter(n => n.type === 'vehicle-request').length;
      default:
        return this.notifications.length;
    }
  }

  /**
   * Handle click on notification item
   * Navigate to notification detail page for full control
   */
  onNotificationClick(notification: AppNotification, event: MouseEvent): void {
    // Prevent navigation if clicking delete button
    if ((event.target as HTMLElement).closest('.delete-btn')) {
      return;
    }

    // Mark as read
    if (!notification.isRead) {
      this.notificationService.markAsReadOptimistic(notification.id);
    }

    // Navigate to notification detail page
    this.router.navigate(['/notifications', notification.type, notification.originalId]);

    this.close();
  }

  /**
   * Delete notification
   */
  deleteNotification(notification: AppNotification, event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id);
    this.updateGroupedNotifications();
  }

  /**
   * Get relative time string
   */
  getRelativeTime(timestamp: string): string {
    return this.notificationService.getRelativeTime(timestamp);
  }

  /**
   * Get icon for notification type
   */
  getIcon(type: NotificationType): string {
    switch (type) {
      case 'report':
        return 'report_problem';
      case 'complaint':
        return 'feedback';
      case 'reservation':
        return 'shopping_cart';
      case 'vehicle-request':
        return 'directions_car';
      default:
        return 'notifications';
    }
  }

  /**
   * Get label for notification type
   */
  getTypeLabelKey(type: NotificationType): string {
    switch (type) {
      case 'report':
        return 'notifications.types.report';
      case 'complaint':
        return 'notifications.types.complaint';
      case 'reservation':
        return 'notifications.types.reservation';
      case 'vehicle-request':
        return 'notifications.types.vehicleRequest';
      default:
        return 'header.notifications';
    }
  }

  /**
   * Get connection status label
   */
  getConnectionLabel(): string {
    switch (this.connectionState) {
      case 'connected':
        return 'متصل';
      case 'connecting':
        return 'جاري الاتصال...';
      case 'error':
        return 'خطأ في الاتصال';
      default:
        return 'غير متصل';
    }
  }

  /**
   * Get connection status class
   */
  getConnectionClass(): string {
    return `connection-${this.connectionState}`;
  }

  /**
   * Toggle view between list and settings
   */
  toggleView(view: ViewType): void {
    this.currentView = view;
    this.cdr.markForCheck();
  }

  /**
   * Update settings
   */
  updateSetting(key: keyof NotificationSettings, value: boolean): void {
    this.notificationService.saveSettings({ [key]: value });
  }

  /**
   * Refresh notifications
   */
  refresh(): void {
    this.notificationService.refresh();
  }

  /**
   * Close dropdown
   */
  close(): void {
    this.currentView = 'list';
    this.closed.emit();
  }

  /**
   * Handle click outside dropdown
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  /**
   * Handle keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Navigate to all reports
   */
  goToReports(): void {
    this.router.navigate(['/reports']);
    this.close();
  }

  /**
   * Navigate to all complaints
   */
  goToComplaints(): void {
    this.router.navigate(['/complaints']);
    this.close();
  }

  /**
   * Navigate to store reservations
   */
  goToReservations(): void {
    this.router.navigate(['/store/reservations']);
    this.close();
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    if (!this.hasUnread) return;

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.updateGroupedNotifications();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notificationService.clearAllNotifications();
    this.updateGroupedNotifications();
  }

  /**
   * Track by function for ngFor
   */
  trackById(index: number, notification: AppNotification): string {
    return notification.id;
  }

  /**
   * Track by function for group ngFor
   */
  trackByGroup(index: number, item: { key: string; value: AppNotification[] }): string {
    return item.key;
  }
}
