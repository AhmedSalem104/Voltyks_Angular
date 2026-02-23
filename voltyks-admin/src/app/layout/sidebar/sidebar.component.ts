import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

interface PinnedItem {
  route: string;
  label: string;
  icon: string;
}

const STORAGE_KEY = 'voltyks_sidebar_state';
const PINNED_STORAGE_KEY = 'voltyks_pinned_items';
const SIDEBAR_PINNED_KEY = 'voltyks_sidebar_pinned';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <!-- Backdrop Overlay -->
    <div class="backdrop" [class.is-visible]="isOpen" (click)="close()"></div>

    <!-- Sidebar Container -->
    <aside class="sidebar-wrapper"
           [class.is-expanded]="isOpen"
           [class.is-pinned]="isSidebarPinned"
           #sidebarElement>

      <!-- Logo Section -->
      <div class="logo-section">
        <img class="logo-image" src="assets/images/Voltyks_Logo.jpg" alt="Voltyks Logo" />
        <h1 class="logo-text">Voltyks</h1>
        <!-- Pin Sidebar Button -->
        <button class="pin-sidebar-btn"
                (click)="toggleSidebarPin()"
                [class.is-pinned]="isSidebarPinned"
                [title]="isSidebarPinned ? 'إلغاء التثبيت' : 'تثبيت القائمة'">
          <span class="material-icons">{{ isSidebarPinned ? 'push_pin' : 'push_pin' }}</span>
        </button>
      </div>

      <!-- Toolbar Section -->
      <div class="sidebar-toolbar">
        <!-- Search Button -->
        <button class="toolbar-btn search-btn"
                (click)="toggleSearch()"
                [class.active]="isSearchOpen"
                title="البحث (Ctrl+K)">
          <span class="material-icons">search</span>
        </button>
        <!-- Collapse All -->
        <button class="toolbar-btn"
                (click)="collapseAll()"
                [class.disabled]="!hasExpandedGroups"
                [disabled]="!hasExpandedGroups"
                title="طي الكل">
          <span class="material-icons">unfold_less</span>
        </button>
        <!-- Expand All -->
        <button class="toolbar-btn"
                (click)="expandAll()"
                [class.disabled]="allGroupsExpanded"
                [disabled]="allGroupsExpanded"
                title="فتح الكل">
          <span class="material-icons">unfold_more</span>
        </button>
      </div>

      <!-- Search Container -->
      @if (isSearchOpen) {
        <div class="search-container" [class.active]="isSearchOpen">
          <div class="search-input-wrapper">
            <span class="material-icons search-icon">search</span>
            <input #searchInput
                   type="text"
                   [(ngModel)]="searchQuery"
                   (ngModelChange)="onSearchQueryChange()"
                   (keydown.enter)="navigateToFirstResult()"
                   (keydown.escape)="closeSearch()"
                   (keydown.arrowdown)="focusNextSearchResult($event)"
                   (keydown.arrowup)="focusPreviousSearchResult($event)"
                   placeholder="البحث في القائمة..."
                   class="search-input">
            <span class="keyboard-hint">Esc</span>
          </div>
          @if (searchQuery && filteredItems.length > 0) {
            <div class="search-results">
              @for (result of filteredItems; track result.item.route; let i = $index) {
                <a [routerLink]="result.item.route"
                   class="search-result-item"
                   [class.focused]="focusedSearchIndex === i"
                   (click)="onSearchResultClick()"
                   (mouseenter)="focusedSearchIndex = i">
                  <span class="material-icons result-icon">{{ result.item.icon }}</span>
                  <div class="result-text">
                    <span class="result-label">{{ result.item.label }}</span>
                    <span class="result-group">{{ result.group.label }}</span>
                  </div>
                </a>
              }
            </div>
          }
          @if (searchQuery && filteredItems.length === 0) {
            <div class="search-no-results">
              <span class="material-icons">search_off</span>
              <span>لا توجد نتائج</span>
            </div>
          }
        </div>
      }

      <!-- Pinned Items Section -->
      @if (pinnedItems.length > 0) {
        <div class="pinned-section">
          <div class="section-header">
            <span class="material-icons section-icon">push_pin</span>
            <span class="section-title">المثبتة</span>
            <span class="section-count">{{ pinnedItems.length }}</span>
          </div>
          <div class="section-items">
            @for (item of pinnedItems; track item.route) {
              <a [routerLink]="item.route"
                 routerLinkActive="active"
                 class="nav-link pinned-item"
                 [title]="item.label"
                 (click)="onItemClick()">
                <span class="icon material-icons">{{ item.icon }}</span>
                <span class="text">{{ item.label }}</span>
                <button class="unpin-btn"
                        (click)="unpinItem(item, $event)"
                        title="إلغاء التثبيت">
                  <span class="material-icons">close</span>
                </button>
              </a>
            }
          </div>
        </div>
      }

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
                  (contextmenu)="onItemRightClick(item, $event)"
                >
                  <span class="icon material-icons">{{ item.icon }}</span>
                  <span class="text">{{ item.label }}</span>
                  @if (isPinned(item.route)) {
                    <span class="pin-indicator material-icons">push_pin</span>
                  }
                </a>
              }
            </div>
          </div>
        }
      </nav>

      <!-- Footer Section -->
      <div class="footer-section">
        <p class="version-text" (click)="onVersionClick()">v1.0.0</p>
      </div>
    </aside>

    <!-- Context Menu for Pin -->
    @if (showContextMenu) {
      <div class="context-menu"
           [style.top.px]="contextMenuY"
           [style.left.px]="contextMenuX"
           (mouseleave)="closeContextMenu()">
        @if (contextMenuItem && !isPinned(contextMenuItem.route)) {
          <button class="context-menu-item" (click)="pinItem(contextMenuItem)">
            <span class="material-icons">push_pin</span>
            <span>تثبيت</span>
          </button>
        }
        @if (contextMenuItem && isPinned(contextMenuItem.route)) {
          <button class="context-menu-item" (click)="unpinItemByRoute(contextMenuItem.route)">
            <span class="material-icons">push_pin</span>
            <span>إلغاء التثبيت</span>
          </button>
        }
      </div>
    }

    <!-- Vault Password Modal -->
    @if (showVaultPrompt) {
      <div class="vault-overlay" (click)="closeVaultPrompt()">
        <div class="vault-modal" (click)="$event.stopPropagation()">
          <div class="vault-icon">
            <span class="material-icons">lock</span>
          </div>
          <input
            #vaultInput
            type="password"
            class="vault-input"
            [(ngModel)]="vaultPassword"
            (keydown.enter)="submitVaultPassword()"
            (keydown.escape)="closeVaultPrompt()"
            placeholder="Enter access key"
            [class.shake]="vaultError"
            autocomplete="off"
          />
          @if (vaultError) {
            <span class="vault-error">Access denied</span>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('sidebarElement') sidebarElement!: ElementRef<HTMLElement>;

  private sidebarService = inject(SidebarService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private subscriptions: Subscription[] = [];

  isOpen = false;
  isSidebarPinned = false;

  // Search
  isSearchOpen = false;
  searchQuery = '';
  focusedSearchIndex = 0;

  // Pinned Items
  pinnedItems: PinnedItem[] = [];

  // Context Menu
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuItem: MenuItem | null = null;

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
        { label: 'المستخدمون', icon: 'people', route: '/users' },
        { label: 'إنشاء أدمن', icon: 'admin_panel_settings', route: '/create-admin' }
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

  // Computed properties
  get hasExpandedGroups(): boolean {
    return this.menuGroups.some(g => g.expanded);
  }

  get allGroupsExpanded(): boolean {
    return this.menuGroups.every(g => g.expanded);
  }

  get filteredItems(): { group: MenuGroup; item: MenuItem }[] {
    if (!this.searchQuery.trim()) return [];
    const query = this.searchQuery.toLowerCase();
    const results: { group: MenuGroup; item: MenuItem }[] = [];

    this.menuGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.label.toLowerCase().includes(query) ||
            group.label.toLowerCase().includes(query)) {
          results.push({ group, item });
        }
      });
    });
    return results;
  }

  ngOnInit(): void {
    // Load saved states
    this.loadExpandedState();
    this.loadPinnedItems();
    this.loadSidebarPinnedState();

    // Subscribe to sidebar state changes
    this.subscriptions.push(
      this.sidebarService.isOpen$.subscribe(isOpen => {
        this.isOpen = isOpen;
        this.cdr.markForCheck();
      })
    );

    // Track navigation for expanding active group
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

  // ========== Keyboard Shortcuts ==========
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+K or Cmd+K to toggle search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.toggleSearch();
    }

    // Escape to close search or context menu
    if (event.key === 'Escape') {
      if (this.isSearchOpen) {
        this.closeSearch();
      }
      if (this.showContextMenu) {
        this.closeContextMenu();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close context menu on outside click
    if (this.showContextMenu) {
      this.closeContextMenu();
    }
  }

  // ========== Search Methods ==========
  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    this.searchQuery = '';
    this.focusedSearchIndex = 0;
    this.cdr.markForCheck();

    if (this.isSearchOpen) {
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
      }, 100);
    }
  }

  closeSearch(): void {
    this.isSearchOpen = false;
    this.searchQuery = '';
    this.focusedSearchIndex = 0;
    this.cdr.markForCheck();
  }

  onSearchQueryChange(): void {
    this.focusedSearchIndex = 0;
    this.cdr.markForCheck();
  }

  navigateToFirstResult(): void {
    if (this.filteredItems.length > 0) {
      const result = this.filteredItems[this.focusedSearchIndex];
      this.router.navigate([result.item.route]);
      this.closeSearch();
      this.onItemClick();
    }
  }

  onSearchResultClick(): void {
    this.closeSearch();
    this.onItemClick();
  }

  focusNextSearchResult(event: Event): void {
    event.preventDefault();
    if (this.focusedSearchIndex < this.filteredItems.length - 1) {
      this.focusedSearchIndex++;
      this.cdr.markForCheck();
    }
  }

  focusPreviousSearchResult(event: Event): void {
    event.preventDefault();
    if (this.focusedSearchIndex > 0) {
      this.focusedSearchIndex--;
      this.cdr.markForCheck();
    }
  }

  // ========== Collapse/Expand All ==========
  collapseAll(): void {
    this.menuGroups.forEach(group => group.expanded = false);
    this.saveExpandedState();
    this.cdr.markForCheck();
  }

  expandAll(): void {
    this.menuGroups.forEach(group => group.expanded = true);
    this.saveExpandedState();
    this.cdr.markForCheck();
  }

  // ========== Sidebar Pin ==========
  toggleSidebarPin(): void {
    this.isSidebarPinned = !this.isSidebarPinned;
    this.saveSidebarPinnedState();
    this.cdr.markForCheck();
  }

  private loadSidebarPinnedState(): void {
    try {
      const saved = localStorage.getItem(SIDEBAR_PINNED_KEY);
      if (saved) {
        this.isSidebarPinned = JSON.parse(saved);
      }
    } catch (e) {
      // Invalid storage data
    }
  }

  private saveSidebarPinnedState(): void {
    try {
      localStorage.setItem(SIDEBAR_PINNED_KEY, JSON.stringify(this.isSidebarPinned));
    } catch (e) {
      // Storage unavailable
    }
  }

  // ========== Pinned Items ==========
  isPinned(route: string): boolean {
    return this.pinnedItems.some(p => p.route === route);
  }

  pinItem(item: MenuItem): void {
    if (!this.isPinned(item.route)) {
      this.pinnedItems.push({
        route: item.route,
        label: item.label,
        icon: item.icon
      });
      this.savePinnedItems();
      this.cdr.markForCheck();
    }
    this.closeContextMenu();
  }

  unpinItem(item: PinnedItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.pinnedItems = this.pinnedItems.filter(p => p.route !== item.route);
    this.savePinnedItems();
    this.cdr.markForCheck();
  }

  unpinItemByRoute(route: string): void {
    this.pinnedItems = this.pinnedItems.filter(p => p.route !== route);
    this.savePinnedItems();
    this.closeContextMenu();
    this.cdr.markForCheck();
  }

  private loadPinnedItems(): void {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) {
        this.pinnedItems = JSON.parse(saved);
      }
    } catch (e) {
      // Invalid storage data
    }
  }

  private savePinnedItems(): void {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(this.pinnedItems));
    } catch (e) {
      // Storage unavailable
    }
  }

  // ========== Context Menu ==========
  onItemRightClick(item: MenuItem, event: MouseEvent): void {
    event.preventDefault();
    this.contextMenuItem = item;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.showContextMenu = true;
    this.cdr.markForCheck();
  }

  closeContextMenu(): void {
    this.showContextMenu = false;
    this.contextMenuItem = null;
    this.cdr.markForCheck();
  }

  // ========== Group Methods ==========
  toggleGroup(group: MenuGroup): void {
    group.expanded = !group.expanded;
    this.saveExpandedState();
    this.cdr.markForCheck();
  }

  isGroupActive(group: MenuGroup): boolean {
    const currentUrl = this.router.url;
    return group.items.some(item => {
      return currentUrl === item.route || currentUrl.startsWith(item.route + '/');
    });
  }

  onItemClick(): void {
    this.close();
  }

  close(): void {
    this.sidebarService.close();
  }

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
      // Invalid storage data
    }
  }

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

  // ========== Secret Vault Access ==========
  private vaultClicks = 0;
  private vaultFirstClick = 0;
  showVaultPrompt = false;
  vaultPassword = '';
  vaultError = false;
  // SHA-256 hash of the vault password
  private readonly vaultHash = '26e81ea7fc1b0d6231aa76ebc7402fc4e15b31a8e0502a9bbf095323439014eb';

  onVersionClick(): void {
    const now = Date.now();
    if (now - this.vaultFirstClick > 3000) {
      this.vaultClicks = 0;
      this.vaultFirstClick = now;
    }
    this.vaultClicks++;
    if (this.vaultClicks >= 5) {
      this.vaultClicks = 0;
      this.showVaultPrompt = true;
      this.vaultPassword = '';
      this.vaultError = false;
      this.cdr.markForCheck();
      setTimeout(() => {
        const input = document.querySelector('.vault-input') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  }

  closeVaultPrompt(): void {
    this.showVaultPrompt = false;
    this.vaultPassword = '';
    this.vaultError = false;
    this.cdr.markForCheck();
  }

  async submitVaultPassword(): Promise<void> {
    const hash = await this.sha256(this.vaultPassword);
    if (hash === this.vaultHash) {
      this.showVaultPrompt = false;
      this.vaultPassword = '';
      this.router.navigate(['/sys-vault']);
      this.close();
    } else {
      this.vaultError = true;
      this.vaultPassword = '';
      this.cdr.markForCheck();
      setTimeout(() => {
        this.vaultError = false;
        this.cdr.markForCheck();
        const input = document.querySelector('.vault-input') as HTMLInputElement;
        input?.focus();
      }, 1500);
    }
  }

  private async sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
