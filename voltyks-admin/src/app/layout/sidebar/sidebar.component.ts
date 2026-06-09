import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SidebarService } from '../../core/services/sidebar.service';
import { VaultService } from '../../core/services/vault.service';
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
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe],
  template: `
    <!-- Backdrop Overlay -->
    <div class="backdrop" [class.is-visible]="isOpen" (click)="close()"></div>

    <!-- Sidebar Container -->
    <aside class="sidebar-wrapper"
           [class.is-expanded]="isOpen"
           [class.is-pinned]="isSidebarPinned"
           role="navigation"
           [attr.aria-label]="'header.menu' | translate"
           #sidebarElement>

      <!-- Logo Section -->
      <div class="logo-section">
        <img class="logo-image" src="assets/images/Voltyks_Logo.jpg" alt="Voltyks Logo" />
        <h1 class="logo-text">Voltyks</h1>
        <!-- Pin Sidebar Button -->
        <button class="pin-sidebar-btn"
                (click)="toggleSidebarPin()"
                [class.is-pinned]="isSidebarPinned"
                [title]="(isSidebarPinned ? 'sidebar.unpinSidebar' : 'sidebar.pinSidebar') | translate">
          <span class="material-symbols-rounded">{{ isSidebarPinned ? 'push_pin' : 'push_pin' }}</span>
        </button>
      </div>

      <!-- Toolbar Section -->
      <div class="sidebar-toolbar">
        <!-- Search Button -->
        <button class="toolbar-btn search-btn"
                (click)="toggleSearch()"
                [class.active]="isSearchOpen"
                [title]="'sidebar.searchHint' | translate"
                [attr.aria-label]="'sidebar.search' | translate">
          <span class="material-symbols-rounded">search</span>
        </button>
        <!-- Collapse All -->
        <button class="toolbar-btn"
                (click)="collapseAll()"
                [class.disabled]="!hasExpandedGroups"
                [disabled]="!hasExpandedGroups"
                [title]="'sidebar.collapseAll' | translate"
                [attr.aria-label]="'sidebar.collapseAll' | translate">
          <span class="material-symbols-rounded">unfold_less</span>
        </button>
        <!-- Expand All -->
        <button class="toolbar-btn"
                (click)="expandAll()"
                [class.disabled]="allGroupsExpanded"
                [disabled]="allGroupsExpanded"
                [title]="'sidebar.expandAll' | translate"
                [attr.aria-label]="'sidebar.expandAll' | translate">
          <span class="material-symbols-rounded">unfold_more</span>
        </button>
      </div>

      <!-- Search Container -->
      @if (isSearchOpen) {
        <div class="search-container" [class.active]="isSearchOpen" role="search">
          <div class="search-input-wrapper">
            <span class="material-symbols-rounded search-icon">search</span>
            <input #searchInput
                   type="text"
                   [(ngModel)]="searchQuery"
                   (ngModelChange)="onSearchQueryChange()"
                   (keydown.enter)="navigateToFirstResult()"
                   (keydown.escape)="closeSearch()"
                   (keydown.arrowdown)="focusNextSearchResult($event)"
                   (keydown.arrowup)="focusPreviousSearchResult($event)"
                   [placeholder]="'sidebar.search' | translate"
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
                  <span class="material-symbols-rounded result-icon">{{ result.item.icon }}</span>
                  <div class="result-text">
                    <span class="result-label">{{ result.item.label | translate }}</span>
                    <span class="result-group">{{ result.group.label | translate }}</span>
                  </div>
                </a>
              }
            </div>
          }
          @if (searchQuery && filteredItems.length === 0) {
            <div class="search-no-results">
              <span class="material-symbols-rounded">search_off</span>
              <span>{{ 'sidebar.noResults' | translate }}</span>
            </div>
          }
        </div>
      }

      <!-- Pinned Items Section -->
      @if (pinnedItems.length > 0) {
        <div class="pinned-section">
          <div class="section-header">
            <span class="material-symbols-rounded section-icon">push_pin</span>
            <span class="section-title">{{ 'sidebar.pinned' | translate }}</span>
            <span class="section-count">{{ pinnedItems.length }}</span>
          </div>
          <div class="section-items">
            @for (item of pinnedItems; track item.route) {
              <a [routerLink]="item.route"
                 routerLinkActive="active"
                 class="nav-link pinned-item"
                 [title]="item.label | translate"
                 (click)="onItemClick()">
                <span class="icon material-symbols-rounded">{{ item.icon }}</span>
                <span class="text">{{ item.label | translate }}</span>
                <button class="unpin-btn"
                        (click)="unpinItem(item, $event)"
                        [attr.aria-label]="'sidebar.unpin' | translate"
                        [title]="'sidebar.unpin' | translate">
                  <span class="material-symbols-rounded">close</span>
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
              [attr.aria-expanded]="group.expanded"
              [attr.aria-controls]="'group-items-' + group.id"
              (click)="toggleGroup(group)"
              [title]="group.label | translate"
            >
              <span class="icon material-symbols-rounded">{{ group.icon }}</span>
              <span class="text">{{ group.label | translate }}</span>
              <span class="chevron material-symbols-rounded" [class.rotated]="group.expanded">
                expand_more
              </span>
            </button>

            <!-- Group Items -->
            <div class="group-items" [class.expanded]="group.expanded" [id]="'group-items-' + group.id" role="list">
              @for (item of group.items; track item.route) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  class="nav-link"
                  [title]="item.label | translate"
                  role="listitem"
                  (click)="onItemClick()"
                  (contextmenu)="onItemRightClick(item, $event)"
                >
                  <span class="icon material-symbols-rounded">{{ item.icon }}</span>
                  <span class="text">{{ item.label | translate }}</span>
                  @if (isPinned(item.route)) {
                    <span class="pin-indicator material-symbols-rounded">push_pin</span>
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
            <span class="material-symbols-rounded">push_pin</span>
            <span>{{ 'sidebar.pin' | translate }}</span>
          </button>
        }
        @if (contextMenuItem && isPinned(contextMenuItem.route)) {
          <button class="context-menu-item" (click)="unpinItemByRoute(contextMenuItem.route)">
            <span class="material-symbols-rounded">push_pin</span>
            <span>{{ 'sidebar.unpin' | translate }}</span>
          </button>
        }
      </div>
    }

    <!-- Vault Password Modal -->
    @if (showVaultPrompt) {
      <div class="vault-overlay" (click)="closeVaultPrompt()">
        <div class="vault-modal" (click)="$event.stopPropagation()">
          <div class="vault-icon">
            <span class="material-symbols-rounded">lock</span>
          </div>
          <input
            #vaultInput
            type="password"
            class="vault-input"
            [(ngModel)]="vaultPassword"
            (keydown.enter)="submitVaultPassword()"
            (keydown.escape)="closeVaultPrompt()"
            [placeholder]="'sidebar.vault.placeholder' | translate"
            [class.shake]="vaultError"
            autocomplete="off"
          />
          @if (vaultError) {
            <span class="vault-error">{{ "sidebar.vault.accessDenied" | translate }}</span>
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
  private vaultService = inject(VaultService);
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
      label: 'sidebar.groups.main',
      icon: 'space_dashboard',
      expanded: true,
      items: [
        { label: 'sidebar.items.dashboard', icon: 'space_dashboard', route: '/dashboard' }
      ]
    },
    {
      id: 'users',
      label: 'sidebar.groups.users',
      icon: 'group',
      expanded: false,
      items: [
        { label: 'sidebar.items.users', icon: 'group', route: '/users' },
        { label: 'sidebar.items.vehicleAdditionRequests', icon: 'directions_car', route: '/vehicle-addition-requests' },
        { label: 'sidebar.items.createAdmin', icon: 'person_add', route: '/create-admin' }
      ]
    },
    {
      id: 'operations',
      label: 'sidebar.groups.operations',
      icon: 'flash_on',
      expanded: false,
      items: [
        { label: 'sidebar.items.processes', icon: 'flash_on', route: '/processes' },
        { label: 'sidebar.items.chargers', icon: 'ev_station', route: '/chargers' },
        { label: 'sidebar.items.vehicles', icon: 'electric_car', route: '/vehicles' }
      ]
    },
    {
      id: 'catalog',
      label: 'sidebar.groups.catalog',
      icon: 'auto_awesome',
      expanded: false,
      items: [
        { label: 'sidebar.items.brands', icon: 'loyalty', route: '/brands' },
        { label: 'sidebar.items.models', icon: 'directions_car', route: '/models' }
      ]
    },
    {
      id: 'settings',
      label: 'sidebar.groups.settings',
      icon: 'tune',
      expanded: false,
      items: [
        { label: 'sidebar.items.chargingProtocols', icon: 'cable', route: '/charging-protocols' },
        { label: 'sidebar.items.capacities', icon: 'battery_charging_full', route: '/capacities' },
        { label: 'sidebar.items.fees', icon: 'receipt_long', route: '/fees' },
        { label: 'sidebar.items.terms', icon: 'gavel', route: '/terms' },
        { label: 'sidebar.items.protocol', icon: 'verified_user', route: '/protocol' },
        { label: 'sidebar.items.appConfig', icon: 'smartphone', route: '/app-config' },
        { label: 'sidebar.items.adminsMode', icon: 'admin_panel_settings', route: '/admins-mode' },
        { label: 'sidebar.items.antiRestrictions', icon: 'block', route: '/anti-restrictions' }
      ]
    },
    {
      id: 'analytics',
      label: 'sidebar.groups.analytics',
      icon: 'insights',
      expanded: false,
      items: [
        { label: 'sidebar.items.reports', icon: 'assessment', route: '/reports' },
        { label: 'sidebar.items.complaints', icon: 'support_agent', route: '/complaints' },
        { label: 'sidebar.items.complaintCategories', icon: 'label', route: '/complaint-categories' }
      ]
    },
    {
      id: 'notifications',
      label: 'sidebar.groups.notifications',
      icon: 'campaign',
      expanded: false,
      items: [
        { label: 'sidebar.items.notificationTemplates', icon: 'edit_note', route: '/notifications/templates' },
        { label: 'sidebar.items.sendToUser', icon: 'forward_to_inbox', route: '/notifications/send-user' },
        { label: 'sidebar.items.broadcast', icon: 'campaign', route: '/notifications/broadcast' }
      ]
    },
    {
      id: 'store',
      label: 'sidebar.groups.store',
      icon: 'shopping_bag',
      expanded: false,
      items: [
        { label: 'sidebar.items.store', icon: 'shopping_bag', route: '/store' }
      ]
    },
    {
      id: 'info',
      label: 'sidebar.groups.info',
      icon: 'info',
      expanded: false,
      items: [
        { label: 'sidebar.items.about', icon: 'info', route: '/about' }
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
      this.vaultService.unlock();
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
