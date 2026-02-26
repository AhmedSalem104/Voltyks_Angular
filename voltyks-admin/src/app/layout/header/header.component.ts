import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationDropdownComponent } from '../../shared/components/notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NotificationDropdownComponent],
  template: `
    <header class="header">
      <div class="header-left">
        <button class="menu-toggle" (click)="toggleMenu()">
          <span class="material-symbols-rounded">menu</span>
        </button>
        <h2 class="page-title">{{ pageTitle }}</h2>
      </div>

      <div class="header-right">
        <!-- User Info -->
        <div class="user-section">
          <div class="user-avatar">
            <span class="material-symbols-rounded">account_circle</span>
          </div>
          <span class="user-name">{{ currentUser?.firstName || 'المسؤول' }}</span>
        </div>

        <!-- Notifications -->
        <div class="notification-wrapper">
          <button
            class="notification-btn"
            (click)="toggleNotifications($event)"
            [class.active]="showNotifications"
            title="الإشعارات"
          >
            <span class="material-symbols-rounded">notifications</span>
            @if (unreadCount > 0) {
              <span class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            }
          </button>
          <app-notification-dropdown
            [isOpen]="showNotifications"
            (closed)="showNotifications = false"
          ></app-notification-dropdown>
        </div>

        <!-- Theme Toggle -->
        <button class="theme-toggle" (click)="toggleTheme()" [title]="(currentTheme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن')">
          <span class="material-symbols-rounded">{{ currentTheme === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
        </button>

        <!-- Logout Button -->
        <button class="logout-btn" (click)="logout()" title="تسجيل الخروج">
          <span class="material-symbols-rounded">logout</span>
        </button>
      </div>
    </header>
  `,
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private sidebarService = inject(SidebarService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  pageTitle: string = 'لوحة التحكم';
  currentUser: any = null;
  showDropdown: boolean = false;
  currentTheme: 'dark' | 'light' = 'dark';

  // Notifications
  showNotifications = false;
  unreadCount = 0;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Load current user
    this.currentUser = this.authService.currentUserValue;

    // Subscribe to user changes
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Subscribe to theme changes
    this.subscriptions.push(
      this.themeService.theme$.subscribe(theme => {
        this.currentTheme = theme;
      })
    );

    // Subscribe to unread count
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
        this.cdr.markForCheck();
      })
    );

    // Delay notification service connection to improve initial page load
    // Connect after 3 seconds to let the main content load first
    setTimeout(() => {
      this.notificationService.connect();
    }, 3000);
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // Disconnect from notification service
    this.notificationService.disconnect();
  }

  toggleMenu(): void {
    this.sidebarService.toggle();
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  goToProfile(): void {
    this.showDropdown = false;
    this.router.navigate(['/profile']);
  }

  goToSettings(): void {
    this.showDropdown = false;
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.showDropdown = false;

    this.authService.logout().subscribe({
      next: () => {},
      error: () => {
        // Even if logout API fails, clear local auth
        this.authService.clearAuth();
      }
    });
  }
}
