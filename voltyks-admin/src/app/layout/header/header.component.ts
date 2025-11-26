import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="header-left">
        <button class="menu-toggle" (click)="toggleMenu()">
          <span class="material-icons">menu</span>
        </button>
        <h2 class="page-title">{{ pageTitle }}</h2>
      </div>

      <div class="header-right">
        <!-- User Info -->
        <div class="user-section">
          <div class="user-avatar">
            <span class="material-icons">account_circle</span>
          </div>
          <span class="user-name">{{ currentUser?.firstName || 'المسؤول' }}</span>
        </div>

        <!-- Theme Toggle -->
        <button class="theme-toggle" (click)="toggleTheme()" [title]="(currentTheme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن')">
          <span class="material-icons">{{ currentTheme === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
        </button>

        <!-- Logout Button -->
        <button class="logout-btn" (click)="logout()" title="تسجيل الخروج">
          <span class="material-icons">logout</span>
        </button>
      </div>
    </header>
  `,
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private sidebarService = inject(SidebarService);

  pageTitle: string = 'لوحة التحكم';
  notificationCount: number = 5;
  currentUser: any = null;
  showDropdown: boolean = false;
  currentTheme: 'dark' | 'light' = 'dark';

  ngOnInit(): void {
    // Load current user
    this.currentUser = this.authService.currentUserValue;

    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  toggleMenu(): void {
    this.sidebarService.toggle();
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
    console.log('🔴 Logging out...');

    this.authService.logout().subscribe({
      next: () => {
        console.log('✅ Logout successful');
      },
      error: (error) => {
        console.error('❌ Logout error:', error);
        // Even if logout API fails, clear local auth
        this.authService.clearAuth();
      }
    });
  }
}
