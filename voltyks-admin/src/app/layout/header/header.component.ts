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

        <!-- Language Picker (dropdown) -->
        <div class="lang-picker" (document:click)="onDocumentClick($event)">
          <button
            type="button"
            class="lang-trigger"
            [class.open]="showLangMenu"
            [attr.aria-expanded]="showLangMenu"
            aria-haspopup="listbox"
            (click)="toggleLangMenu($event)"
            [title]="'header.toggleLanguage' | translate"
          >
            <span class="material-symbols-rounded lang-icon">language</span>
            <span class="lang-current" [lang]="currentLanguage">
              {{ currentLanguage === 'ar' ? 'العربية' : 'English' }}
            </span>
            <span class="material-symbols-rounded lang-chevron">expand_more</span>
          </button>

          @if (showLangMenu) {
            <ul class="lang-menu" role="listbox" [attr.aria-label]="'header.toggleLanguage' | translate">
              <li role="option" [attr.aria-selected]="currentLanguage === 'ar'">
                <button
                  type="button"
                  class="lang-option"
                  [class.active]="currentLanguage === 'ar'"
                  (click)="pickLanguage('ar')"
                >
                  <span class="lang-flag" lang="ar">ع</span>
                  <span class="lang-text">
                    <span class="lang-text-primary">العربية</span>
                    <span class="lang-text-secondary">Arabic</span>
                  </span>
                  @if (currentLanguage === 'ar') {
                    <span class="material-symbols-rounded lang-check">check</span>
                  }
                </button>
              </li>
              <li role="option" [attr.aria-selected]="currentLanguage === 'en'">
                <button
                  type="button"
                  class="lang-option"
                  [class.active]="currentLanguage === 'en'"
                  (click)="pickLanguage('en')"
                >
                  <span class="lang-flag" lang="en">EN</span>
                  <span class="lang-text">
                    <span class="lang-text-primary">English</span>
                    <span class="lang-text-secondary">الإنجليزية</span>
                  </span>
                  @if (currentLanguage === 'en') {
                    <span class="material-symbols-rounded lang-check">check</span>
                  }
                </button>
              </li>
            </ul>
          }
        </div>

        <!-- Theme Toggle (single icon, animated sun/moon) -->
        <button
          type="button"
          class="theme-toggle"
          [class.is-light]="currentTheme === 'light'"
          (click)="toggleTheme()"
          [title]="(currentTheme === 'dark' ? 'header.themeLight' : 'header.themeDark') | translate"
          [attr.aria-label]="(currentTheme === 'dark' ? 'header.themeLight' : 'header.themeDark') | translate"
        >
          <span class="material-symbols-rounded icon-moon">dark_mode</span>
          <span class="material-symbols-rounded icon-sun">light_mode</span>
        </button>

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

  // Language dropdown
  showLangMenu = false;

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

  toggleLangMenu(event: Event): void {
    event.stopPropagation();
    this.showLangMenu = !this.showLangMenu;
  }

  pickLanguage(lang: Language): void {
    this.showLangMenu = false;
    if (this.currentLanguage !== lang) {
      this.languageService.setLanguage(lang);
    }
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.showLangMenu) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.lang-picker')) {
      this.showLangMenu = false;
      this.cdr.markForCheck();
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
