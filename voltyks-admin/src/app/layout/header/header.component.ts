import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { NotificationService } from '../../core/services/notification.service';
import { LanguageService, Language } from '../../core/services/language.service';
import { NotificationDropdownComponent } from '../../shared/components/notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NotificationDropdownComponent, TranslatePipe],
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
          <span class="user-name">{{ currentUser?.firstName || ('header.profile' | translate) }}</span>
        </div>

        <!-- Notifications -->
        <div class="notification-wrapper">
          <button
            class="notification-btn"
            (click)="toggleNotifications($event)"
            [class.active]="showNotifications"
            [title]="'header.notifications' | translate"
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

        <!-- Language Toggle (segmented pill with sliding indicator) -->
        <div
          class="seg-toggle lang-toggle"
          [class.is-second]="currentLanguage === 'en'"
          role="group"
          [attr.aria-label]="'header.toggleLanguage' | translate"
        >
          <span class="seg-indicator" aria-hidden="true"></span>
          <button
            type="button"
            class="seg-option"
            [class.active]="currentLanguage === 'ar'"
            [attr.aria-pressed]="currentLanguage === 'ar'"
            (click)="setLanguage('ar')"
            title="العربية"
          >
            <span class="seg-code" lang="ar">ع</span>
            <span class="seg-label">العربية</span>
          </button>
          <button
            type="button"
            class="seg-option"
            [class.active]="currentLanguage === 'en'"
            [attr.aria-pressed]="currentLanguage === 'en'"
            (click)="setLanguage('en')"
            title="English"
          >
            <span class="seg-code" lang="en">EN</span>
            <span class="seg-label">English</span>
          </button>
        </div>

        <!-- Theme Toggle (segmented pill with sliding indicator) -->
        <div
          class="seg-toggle theme-toggle"
          [class.is-second]="currentTheme === 'light'"
          role="group"
          [attr.aria-label]="'header.toggleTheme' | translate"
        >
          <span class="seg-indicator" aria-hidden="true"></span>
          <button
            type="button"
            class="seg-option"
            [class.active]="currentTheme === 'dark'"
            [attr.aria-pressed]="currentTheme === 'dark'"
            (click)="setTheme('dark')"
            [title]="'header.themeDark' | translate"
          >
            <span class="material-symbols-rounded">dark_mode</span>
          </button>
          <button
            type="button"
            class="seg-option"
            [class.active]="currentTheme === 'light'"
            [attr.aria-pressed]="currentTheme === 'light'"
            (click)="setTheme('light')"
            [title]="'header.themeLight' | translate"
          >
            <span class="material-symbols-rounded">light_mode</span>
          </button>
        </div>

        <!-- Logout Button -->
        <button class="logout-btn" (click)="logout()" [title]="'header.logout' | translate">
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
  private languageService = inject(LanguageService);
  private sidebarService = inject(SidebarService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  pageTitle: string = '';
  currentUser: any = null;
  showDropdown: boolean = false;
  currentTheme: 'dark' | 'light' = 'dark';
  currentLanguage: Language = 'ar';

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

    // Subscribe to language changes
    this.subscriptions.push(
      this.languageService.language$.subscribe(lang => {
        this.currentLanguage = lang;
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

  setTheme(theme: 'dark' | 'light'): void {
    if (this.currentTheme !== theme) {
      this.themeService.setTheme(theme);
    }
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  setLanguage(lang: Language): void {
    if (this.currentLanguage !== lang) {
      this.languageService.setLanguage(lang);
    }
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
