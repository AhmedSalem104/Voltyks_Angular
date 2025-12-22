import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

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
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-link"
            [title]="item.label"
            (click)="close()"
          >
            <span class="icon material-icons">{{ item.icon }}</span>
            <span class="text">{{ item.label }}</span>
          </a>
        }
      </nav>

      <!-- Footer Section -->
      <div class="footer-section">
        <p class="version-text">v1.0.0</p>
      </div>
    </aside>
  `,
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private sidebarService = inject(SidebarService);
  isOpen = false;

  navItems: NavItem[] = [
    { label: 'لوحة التحكم', icon: 'dashboard', route: '/dashboard' },
    { label: 'المستخدمون', icon: 'people', route: '/users' },
    { label: 'عمليات الشحن', icon: 'electric_bolt', route: '/processes' },
    { label: 'الشواحن', icon: 'ev_station', route: '/chargers' },
    { label: 'المركبات', icon: 'directions_car_filled', route: '/vehicles' },
    { label: 'العلامات التجارية', icon: 'category', route: '/brands' },
    { label: 'الموديلات', icon: 'directions_car', route: '/models' },
    { label: 'بروتوكولات الشحن', icon: 'electrical_services', route: '/charging-protocols' },
    { label: 'سعات الشواحن', icon: 'bolt', route: '/capacities' },
    { label: 'الرسوم', icon: 'payments', route: '/fees' },
    { label: 'الشروط والأحكام', icon: 'description', route: '/terms' },
    { label: 'البروتوكول', icon: 'policy', route: '/protocol' },
    { label: 'التقارير', icon: 'report', route: '/reports' },
    { label: 'الشكاوى', icon: 'feedback', route: '/complaints' },
    { label: 'أنواع الشكاوى', icon: 'category', route: '/complaint-categories' },
    { label: 'إعدادات التطبيق', icon: 'phone_android', route: '/app-config' },
    { label: 'عن Voltyks', icon: 'info', route: '/about' }
  ];

  ngOnInit(): void {
    // Subscribe to sidebar state changes
    this.sidebarService.isOpen$.subscribe(isOpen => {
      this.isOpen = isOpen;
    });
  }

  close(): void {
    this.sidebarService.close();
  }
}
