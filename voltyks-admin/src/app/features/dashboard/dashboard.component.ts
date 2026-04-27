import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AdminUsersService } from '../../core/services/admin/admin-users.service';
import { AdminFeesService } from '../../core/services/admin/admin-fees.service';
import { AdminReportsService } from '../../core/services/admin/admin-reports.service';
import { AdminBrandsService } from '../../core/services/admin/admin-brands.service';
import { AdminChargersService } from '../../core/services/admin/admin-chargers.service';
import { AdminVehiclesService } from '../../core/services/admin/admin-vehicles.service';
import { AdminComplaintsService } from '../../core/services/admin/admin-complaints.service';
import { AdminComplaintCategoriesService } from '../../core/services/admin/admin-complaint-categories.service';
import { AdminProcessesService } from '../../core/services/admin/admin-processes.service';
import { AppConfigService } from '../../core/services/admin/app-config.service';
import { AdminStoreService } from '../../core/services/admin/admin-store.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { AppNotification, AdminReservationDto } from '../../core/models';

Chart.register(...registerables);

// Section Loading States
interface SectionLoading {
  users: boolean;
  vehicles: boolean;
  chargers: boolean;
  reports: boolean;
  brands: boolean;
  fees: boolean;
  complaints: boolean;
  processes: boolean;
  store: boolean;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalVehicles: number;
  totalChargers: number;
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  totalBrands: number;
  totalModels: number;
  currentFees: number;
  averageRating: number;
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  totalComplaintCategories: number;
  totalProcesses: number;
  totalCategories: number;
  activeCategories: number;
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  totalReservations: number;
  pendingReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  totalRevenue: number;
  paidRevenue: number;
}

interface RecentReport {
  id: number;
  userFullName: string;
  reportContent: string;
  reportDate: string;
  isResolved: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  // Section Loading States - each section loads independently
  sectionLoading: SectionLoading = {
    users: true,
    vehicles: true,
    chargers: true,
    reports: true,
    brands: true,
    fees: true,
    complaints: true,
    processes: true,
    store: true
  };

  stats: DashboardStats = {
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    totalVehicles: 0,
    totalChargers: 0,
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    totalBrands: 0,
    totalModels: 0,
    currentFees: 0,
    averageRating: 0,
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    totalComplaintCategories: 0,
    totalProcesses: 0,
    totalCategories: 0,
    activeCategories: 0,
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    totalReservations: 0,
    pendingReservations: 0,
    completedReservations: 0,
    cancelledReservations: 0,
    totalRevenue: 0,
    paidRevenue: 0
  };

  recentReports: RecentReport[] = [];
  today = new Date();
  currentUser: any = null;
  greeting = '';

  // App Config
  mobileAppEnabled: boolean | null = null;
  chargingModeEnabled: boolean | null = null;

  // Recent Notifications
  recentNotifications: AppNotification[] = [];
  unreadNotificationsCount = 0;

  // Typing Animation
  typingTexts: string[] = [];
  currentTypingText = '';
  typingIndex = 0;
  charIndex = 0;
  isDeleting = false;

  // Charts — labels populated in ngOnInit so they can pick up the active locale
  overviewChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#6366f1', '#00C853', '#ec4899', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  overviewChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        rtl: true,
        textDirection: 'rtl'
      }
    }
  };

  reportsChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['rgba(245, 158, 11, 0.8)', 'rgba(0, 200, 83, 0.8)'],
      borderRadius: 8,
      borderSkipped: false
    }]
  };

  reportsChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        rtl: true
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)' }
      },
      y: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.7)' }
      }
    }
  };

  reservationsChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#f59e0b', '#3b82f6', '#00C853', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  reservationsChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        rtl: true,
        textDirection: 'rtl'
      }
    }
  };

  recentReservations: AdminReservationDto[] = [];

  constructor(
    private usersService: AdminUsersService,
    private feesService: AdminFeesService,
    private reportsService: AdminReportsService,
    private brandsService: AdminBrandsService,
    private chargersService: AdminChargersService,
    private vehiclesService: AdminVehiclesService,
    private complaintsService: AdminComplaintsService,
    private complaintCategoriesService: AdminComplaintCategoriesService,
    private processesService: AdminProcessesService,
    private appConfigService: AppConfigService,
    private storeService: AdminStoreService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.typingTexts = [
      this.translate.instant('dashboard.tagline1'),
      this.translate.instant('dashboard.tagline2'),
      this.translate.instant('dashboard.tagline3')
    ];
    this.overviewChartData.labels = [
      this.t('dashboard.charts.usersAxis'),
      this.t('dashboard.charts.chargersAxis'),
      this.t('dashboard.charts.vehiclesAxis'),
      this.t('dashboard.charts.reportsAxis')
    ];
    this.reportsChartData.labels = [
      this.t('dashboard.charts.pendingAxis'),
      this.t('dashboard.charts.resolvedAxis')
    ];
    this.reservationsChartData.labels = [
      this.t('dashboard.charts.reservationPending'),
      this.t('dashboard.charts.reservationContacted'),
      this.t('dashboard.charts.reservationCompleted'),
      this.t('dashboard.charts.reservationCancelled')
    ];
    this.setGreeting();
    this.subscribeToNotifications();
    this.startTypingAnimation();
    this.loadAppConfig();

    // Load each section independently for progressive loading
    this.loadUsersSection();
    this.loadVehiclesSection();
    this.loadChargersSection();
    this.loadReportsSection();
    this.loadBrandsSection();
    this.loadFeesSection();
    this.loadComplaintsSection();
    this.loadProcessesSection();
    this.loadStoreSection();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ========== Section Loaders (Progressive Loading) ==========

  private loadUsersSection(): void {
    this.usersService.getUsers().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const users = response.data;
          this.stats.totalUsers = users.length;
          this.stats.activeUsers = users.filter(u => !u.isBanned).length;
          this.stats.bannedUsers = users.filter(u => u.isBanned).length;

          const ratings = users.filter(u => u.rating > 0).map(u => u.rating);
          this.stats.averageRating = ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0;
        }
        this.sectionLoading.users = false;
        this.updateOverviewChart();
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.users = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadVehiclesSection(): void {
    this.vehiclesService.getVehicles().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats.totalVehicles = response.data.length;
        }
        this.sectionLoading.vehicles = false;
        this.updateOverviewChart();
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.vehicles = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadChargersSection(): void {
    this.chargersService.getChargers().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats.totalChargers = response.data.length;
        }
        this.sectionLoading.chargers = false;
        this.updateOverviewChart();
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.chargers = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadReportsSection(): void {
    this.reportsService.getReports().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const reports = response.data;
          this.stats.totalReports = reports.length;
          this.stats.pendingReports = reports.filter(r => !r.isResolved).length;
          this.stats.resolvedReports = reports.filter(r => r.isResolved).length;

          this.recentReports = reports
            .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
            .slice(0, 4)
            .map(r => ({
              id: r.id,
              userFullName: r.userFullName,
              reportContent: r.reportContent,
              reportDate: r.reportDate,
              isResolved: r.isResolved
            }));
        }
        this.sectionLoading.reports = false;
        this.updateOverviewChart();
        this.updateReportsChart();
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.reports = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadBrandsSection(): void {
    // Load brands and models
    this.brandsService.getBrands().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats.totalBrands = response.data.length;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); }
    });

    this.brandsService.getModels().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats.totalModels = response.data.length;
        }
        this.sectionLoading.brands = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.brands = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadFeesSection(): void {
    this.feesService.getFees().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats.currentFees = response.data.percentage;
        }
        this.sectionLoading.fees = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.fees = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadComplaintsSection(): void {
    this.complaintsService.getComplaints({ includeResolved: true }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const complaints = response.data;
          this.stats.totalComplaints = complaints.length;
          this.stats.pendingComplaints = complaints.filter(c => !c.isResolved).length;
          this.stats.resolvedComplaints = complaints.filter(c => c.isResolved).length;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); }
    });

    this.complaintCategoriesService.getCategories({ includeDeleted: false }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats.totalComplaintCategories = response.data.length;
        }
        this.sectionLoading.complaints = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.complaints = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadProcessesSection(): void {
    this.processesService.getProcesses().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats.totalProcesses = response.data.length;
        }
        this.sectionLoading.processes = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.processes = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadStoreSection(): void {
    // Load categories
    this.storeService.getCategories().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const categories = response.data;
          this.stats.totalCategories = categories.length;
          this.stats.activeCategories = categories.filter(c => c.status === 'active').length;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); }
    });

    // Load products
    this.storeService.getProducts().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const products = response.data;
          this.stats.totalProducts = products.length;
          this.stats.activeProducts = products.filter(p => p.status === 'active').length;
          this.stats.outOfStockProducts = products.filter(p => !p.isReservable).length;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); }
    });

    // Load reservations
    this.storeService.getReservations({ pageSize: 100 }).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const reservations = response.data.items || [];
          this.stats.totalReservations = reservations.length;
          this.stats.pendingReservations = reservations.filter(r => r.status === 'pending').length;
          this.stats.completedReservations = reservations.filter(r => r.status === 'completed').length;
          this.stats.cancelledReservations = reservations.filter(r => r.status === 'cancelled').length;

          this.stats.totalRevenue = reservations
            .filter(r => r.status !== 'cancelled')
            .reduce((sum, r) => sum + (r.unitPrice * r.quantity), 0);
          this.stats.paidRevenue = reservations
            .filter(r => r.paymentStatus === 'paid')
            .reduce((sum, r) => sum + (r.unitPrice * r.quantity), 0);

          this.recentReservations = reservations
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

          this.updateReservationsChart();
        }
        this.sectionLoading.store = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sectionLoading.store = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ========== Chart Updates ==========

  private updateOverviewChart(): void {
    this.overviewChartData = {
      ...this.overviewChartData,
      datasets: [{
        ...this.overviewChartData.datasets[0],
        data: [this.stats.totalUsers, this.stats.totalChargers, this.stats.totalVehicles, this.stats.totalReports]
      }]
    };
  }

  private updateReportsChart(): void {
    this.reportsChartData = {
      ...this.reportsChartData,
      datasets: [{
        ...this.reportsChartData.datasets[0],
        data: [this.stats.pendingReports, this.stats.resolvedReports]
      }]
    };
  }

  private updateReservationsChart(): void {
    const contactedReservations = this.stats.totalReservations - this.stats.pendingReservations - this.stats.completedReservations - this.stats.cancelledReservations;
    this.reservationsChartData = {
      ...this.reservationsChartData,
      datasets: [{
        ...this.reservationsChartData.datasets[0],
        data: [
          this.stats.pendingReservations,
          contactedReservations > 0 ? contactedReservations : 0,
          this.stats.completedReservations,
          this.stats.cancelledReservations
        ]
      }]
    };
  }

  // ========== App Config ==========

  private loadAppConfig(): void {
    // Load mobile app status
    this.appConfigService.getMobileAppStatus().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.mobileAppEnabled = response.data.mobile_app_enabled;
          this.cdr.markForCheck();
        }
      },
      error: () => { this.cdr.markForCheck(); }
    });

    // Load charging mode status
    this.appConfigService.getChargingModeStatus().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.chargingModeEnabled = response.data.charging_mode_enabled;
          this.cdr.markForCheck();
        }
      },
      error: () => { this.cdr.markForCheck(); }
    });
  }

  // ========== Notifications ==========

  private subscribeToNotifications(): void {
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.recentNotifications = notifications.slice(0, 5);
        this.unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
        this.cdr.markForCheck();
      })
    );
  }

  getRelativeTime(timestamp: string): string {
    return this.notificationService.getRelativeTime(timestamp);
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'report': return 'report_problem';
      case 'complaint': return 'feedback';
      case 'reservation': return 'shopping_cart';
      default: return 'notifications';
    }
  }

  onNotificationClick(notification: AppNotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }

  // ========== Greeting & Typing ==========

  private setGreeting(): void {
    const hour = new Date().getHours();
    let key: string;
    if (hour >= 5 && hour < 12) {
      key = 'dashboard.greetingMorning';
    } else if (hour < 18) {
      key = 'dashboard.greetingAfternoon';
    } else {
      key = 'dashboard.greetingEvening';
    }
    this.greeting = this.translate.instant(key);
  }

  private startTypingAnimation(): void {
    const type = () => {
      const currentText = this.typingTexts[this.typingIndex];

      if (this.isDeleting) {
        this.currentTypingText = currentText.substring(0, this.charIndex - 1);
        this.charIndex--;
      } else {
        this.currentTypingText = currentText.substring(0, this.charIndex + 1);
        this.charIndex++;
      }

      let typeSpeed = this.isDeleting ? 30 : 80;

      if (!this.isDeleting && this.charIndex === currentText.length) {
        typeSpeed = 2000;
        this.isDeleting = true;
      } else if (this.isDeleting && this.charIndex === 0) {
        this.isDeleting = false;
        this.typingIndex = (this.typingIndex + 1) % this.typingTexts.length;
        typeSpeed = 500;
      }

      this.cdr.markForCheck();
      setTimeout(type, typeSpeed);
    };

    type();
  }

  // ========== Helpers ==========

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US') + ' ' + this.t('common.currency');
  }

  getReservationStatusLabel(status: string): string {
    const keyMap: { [key: string]: string } = {
      'pending': 'dashboard.charts.reservationPending',
      'contacted': 'dashboard.charts.reservationContacted',
      'completed': 'dashboard.charts.reservationCompleted',
      'cancelled': 'dashboard.charts.reservationCancelled'
    };
    return keyMap[status] ? this.t(keyMap[status]) : status;
  }

  getReservationStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return this.t('dashboard.timeAgo.today');
    if (days === 1) return this.t('dashboard.timeAgo.yesterday');
    if (days < 7) return this.t('dashboard.timeAgo.daysAgo', { count: days });

    return date.toLocaleDateString(this.translate.currentLang === 'en' ? 'en-US' : 'ar-EG', {
      month: 'short',
      day: 'numeric'
    });
  }

  // Check if all main sections are loaded
  get isMainLoading(): boolean {
    return this.sectionLoading.users && this.sectionLoading.chargers && this.sectionLoading.vehicles;
  }

  // Check if overview chart can be displayed
  get canShowOverviewChart(): boolean {
    return !this.sectionLoading.users || !this.sectionLoading.chargers ||
           !this.sectionLoading.vehicles || !this.sectionLoading.reports;
  }
}
