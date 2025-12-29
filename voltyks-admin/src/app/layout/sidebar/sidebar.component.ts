import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { Subscription, filter } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: string;
  expanded: boolean;
  items: MenuItem[];
}

const STORAGE_KEY = 'voltyks_sidebar_state';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Backdrop Overlay -->
    <div class="backdrop" [class.is-visible]="isOpen" (click)="close()"></div>

    <!-- Sidebar Container -->
    <aside class="sidebar-wrapper" [class.is-expanded]="isOpen">
      <!-- Logo Section -->
      <div class="logo-section">
        <img class="logo-image" src="assets/images/Voltyks_Logo.jpg" alt="Voltyks Logo" />
        <h1 class="logo-text">Voltyks</h1>
      </div>

      <!-- Navigation Menu -->
      <nav class="nav-menu">
        @for (group of menuGroups; track group.id) {
          <div class="menu-group" [class.has-active]="isGroupActive(group)">
            <!-- Group Header -->
            <button
              class="group-header"
              [class.expanded]="group.expanded"
              [class.has-active]="isGroupActive(group)"
              (click)="toggleGroup(group)"
              [title]="group.label"
            >
              <span class="icon material-icons">{{ group.icon }}</span>
              <span class="text">{{ group.label }}</span>
              <span class="chevron material-icons">
                {{ group.expanded ? 'expand_less' : 'expand_more' }}
              </span>
            </button>

            <!-- Group Items -->
            <div class="group-items" [class.expanded]="group.expanded">
              @for (item of group.items; track item.route) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  class="nav-link"
                  [title]="item.label"
                  (click)="onItemClick()"
                >
                  <span class="icon material-icons">{{ item.icon }}</span>
                  <span class="text">{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
        }
      </nav>

      <!-- Footer Section -->
      <div class="footer-section">
        <p class="version-text">v1.0.0</p>
      </div>
    </aside>
  `,
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit, OnDestroy {
  private sidebarService = inject(SidebarService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private subscriptions: Subscription[] = [];

  isOpen = false;

  menuGroups: MenuGroup[] = [
    {
      id: 'main',
      label: 'الرئيسية',
      icon: 'dashboard',
      expanded: true,
      items: [
        { label: 'لوحة التحكم', icon: 'dashboard', route: '/dashboard' }
      ]
    },
    {
      id: 'users',
      label: 'إدارة المستخدمين',
      icon: 'people',
      expanded: false,
      items: [
        { label: 'المستخدمون', icon: 'people', route: '/users' }
      ]
    },
    {
      id: 'operations',
      label: 'العمليات',
      icon: 'electric_bolt',
      expanded: false,
      items: [
        { label: 'عمليات الشحن', icon: 'electric_bolt', route: '/processes' },
        { label: 'الشواحن', icon: 'ev_station', route: '/chargers' },
        { label: 'المركبات', icon: 'directions_car_filled', route: '/vehicles' }
      ]
    },
    {
      id: 'catalog',
      label: 'الكتالوج',
      icon: 'category',
      expanded: false,
      items: [
        { label: 'العلامات التجارية', icon: 'category', route: '/brands' },
        { label: 'الموديلات', icon: 'directions_car', route: '/models' }
      ]
    },
    {
      id: 'settings',
      label: 'إعدادات النظام',
      icon: 'settings',
      expanded: false,
      items: [
        { label: 'بروتوكولات الشحن', icon: 'electrical_services', route: '/charging-protocols' },
        { label: 'سعات الشواحن', icon: 'bolt', route: '/capacities' },
        { label: 'الرسوم', icon: 'payments', route: '/fees' },
        { label: 'الشروط والأحكام', icon: 'description', route: '/terms' },
        { label: 'البروتوكول', icon: 'policy', route: '/protocol' },
        { label: 'إعدادات التطبيق', icon: 'phone_android', route: '/app-config' }
      ]
    },
    {
      id: 'analytics',
      label: 'التقارير والدعم',
      icon: 'analytics',
      expanded: false,
      items: [
        { label: 'التقارير', icon: 'report', route: '/reports' },
        { label: 'الشكاوى', icon: 'feedback', route: '/complaints' },
        { label: 'أنواع الشكاوى', icon: 'category', route: '/complaint-categories' }
      ]
    },
    {
      id: 'store',
      label: 'التجارة الإلكترونية',
      icon: 'storefront',
      expanded: false,
      items: [
        { label: 'المتجر', icon: 'storefront', route: '/store' }
      ]
    },
    {
      id: 'info',
      label: 'معلومات',
      icon: 'info',
      expanded: false,
      items: [
        { label: 'عن Voltyks', icon: 'info', route: '/about' }
      ]
    }
  ];

  ngOnInit(): void {
    // Load saved expanded state from localStorage
    this.loadExpandedState();

    // Subscribe to sidebar state changes
    this.subscriptions.push(
      this.sidebarService.isOpen$.subscribe(isOpen => {
        this.isOpen = isOpen;
        this.cdr.markForCheck();
      })
    );

    // Auto-expand group containing active route on navigation
    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        this.expandActiveGroup();
        this.cdr.markForCheck();
      })
    );

    // Initial expansion of active group
    this.expandActiveGroup();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Toggle group expanded state
   */
  toggleGroup(group: MenuGroup): void {
    group.expanded = !group.expanded;
    this.saveExpandedState();
    this.cdr.markForCheck();
  }

  /**
   * Check if any item in the group is currently active
   */
  isGroupActive(group: MenuGroup): boolean {
    const currentUrl = this.router.url;
    return group.items.some(item => {
      // Check if current URL starts with the item route
      // This handles child routes like /store/products, /users/123
      return currentUrl === item.route || currentUrl.startsWith(item.route + '/');
    });
  }

  /**
   * Handle navigation item click
   */
  onItemClick(): void {
    this.close();
  }

  /**
   * Close sidebar
   */
  close(): void {
    this.sidebarService.close();
  }

  /**
   * Load expanded state from localStorage
   */
  private loadExpandedState(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const expandedState = JSON.parse(saved);
        this.menuGroups.forEach(group => {
          if (expandedState[group.id] !== undefined) {
            group.expanded = expandedState[group.id];
          }
        });
      }
    } catch (e) {
      // Invalid storage data - use defaults
    }
  }

  /**
   * Save expanded state to localStorage
   */
  private saveExpandedState(): void {
    try {
      const state: Record<string, boolean> = {};
      this.menuGroups.forEach(group => {
        state[group.id] = group.expanded;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Storage unavailable
    }
  }

  /**
   * Expand the group containing the currently active route
   */
  private expandActiveGroup(): void {
    const currentUrl = this.router.url;
    this.menuGroups.forEach(group => {
      const hasActiveItem = group.items.some(item =>
        currentUrl === item.route || currentUrl.startsWith(item.route + '/')
      );
      if (hasActiveItem && !group.expanded) {
        group.expanded = true;
        this.saveExpandedState();
      }
    });
  }
}
