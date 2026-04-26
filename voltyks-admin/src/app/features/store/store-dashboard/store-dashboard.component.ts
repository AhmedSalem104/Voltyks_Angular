import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { AdminStoreService } from '../../../core/services/admin/admin-store.service';

interface StoreStats {
  totalCategories: number;
  activeCategories: number;
  totalProducts: number;
  activeProducts: number;
  totalReservations: number;
  pendingReservations: number;
  completedReservations: number;
  unpaidReservations: number;
  pendingDeliveries: number;
}

type TabType = 'overview' | 'categories' | 'products' | 'reservations';

@Component({
  selector: 'app-store-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './store-dashboard.component.html',
  styleUrls: ['./store-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreDashboardComponent implements OnInit {
  activeTab: TabType = 'overview';
  isLoading = false;

  stats: StoreStats = {
    totalCategories: 0,
    activeCategories: 0,
    totalProducts: 0,
    activeProducts: 0,
    totalReservations: 0,
    pendingReservations: 0,
    completedReservations: 0,
    unpaidReservations: 0,
    pendingDeliveries: 0
  };

  constructor(
    private storeService: AdminStoreService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      categories: this.storeService.getCategories(),
      products: this.storeService.getProducts(),
      reservations: this.storeService.getReservations({ pageSize: 1000 })
    }).subscribe({
      next: (responses) => {
        if (responses.categories.status && responses.categories.data) {
          const cats = responses.categories.data;
          this.stats.totalCategories = cats.length;
          this.stats.activeCategories = cats.filter(c => c.status === 'active').length;
        }

        if (responses.products.status && responses.products.data) {
          const prods = responses.products.data;
          this.stats.totalProducts = prods.length;
          this.stats.activeProducts = prods.filter(p => p.status === 'active').length;
        }

        if (responses.reservations.status && responses.reservations.data) {
          const res = responses.reservations.data.items;
          this.stats.totalReservations = responses.reservations.data.totalCount;
          this.stats.pendingReservations = res.filter(r => r.status === 'pending').length;
          this.stats.completedReservations = res.filter(r => r.status === 'completed').length;
          this.stats.unpaidReservations = res.filter(r => r.paymentStatus === 'unpaid').length;
          this.stats.pendingDeliveries = res.filter(r => r.deliveryStatus === 'pending' && r.paymentStatus === 'paid').length;
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  navigateTo(section: string): void {
    this.router.navigate([section], { relativeTo: this.route });
  }

  setActiveTab(tab: TabType): void {
    this.activeTab = tab;
    if (tab !== 'overview') {
      this.navigateTo(tab);
    }
  }
}
