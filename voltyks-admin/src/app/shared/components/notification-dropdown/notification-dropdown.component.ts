import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../core/models';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.component.html',
  styleUrls: ['./notification-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  notifications: AppNotification[] = [];
  isLoading = false;

  private subscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
        this.cdr.markForCheck();
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Check if there are unread notifications
   */
  get hasUnread(): boolean {
    return this.notifications.some(n => !n.isRead);
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  /**
   * Handle click on notification item
   */
  onNotificationClick(notification: AppNotification): void {
    // Mark as read
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck()
      });
    }

    // Navigate based on type
    if (notification.type === 'report') {
      this.router.navigate(['/reports'], {
        queryParams: { highlight: notification.originalId }
      });
    } else if (notification.type === 'complaint') {
      this.router.navigate(['/complaints'], {
        queryParams: { highlight: notification.originalId }
      });
    }

    // Close dropdown
    this.close();
  }

  /**
   * Mark single notification as read
   */
  markAsRead(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck()
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => this.cdr.markForCheck(),
      error: () => this.cdr.markForCheck()
    });
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
  getIcon(type: string): string {
    return type === 'report' ? 'report_problem' : 'feedback';
  }

  /**
   * Close dropdown
   */
  close(): void {
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
}
