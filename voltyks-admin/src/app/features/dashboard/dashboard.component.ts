import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
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
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { forkJoin } from 'rxjs';
import { AppNotification } from '../../core/models';

Chart.register(...registerables);

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
  // New stats
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  totalComplaintCategories: number;
  totalProcesses: number;
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
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
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
    totalProcesses: 0
  };

  recentReports: RecentReport[] = [];
  today = new Date();
  currentUser: any = null;
  isLoading = true;
  greeting = '';

  // App Config
  mobileAppEnabled: boolean | null = null;

  // Recent Notifications
  recentNotifications: AppNotification[] = [];
  unreadNotificationsCount = 0;

  // Typing Animation
  typingTexts = [
    'نظام إدارة شحن المركبات الكهربائية',
    'مستقبل النقل المستدام',
    'شحن ذكي لحياة أفضل'
  ];
  currentTypingText = '';
  typingIndex = 0;
  charIndex = 0;
  isDeleting = false;

  // Charts
  overviewChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['مستخدمين', 'شواحن', 'مركبات', 'بلاغات'],
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
      legend: {
        display: false
      },
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
    labels: ['معلق', 'تم الحل'],
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
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.setGreeting();
    this.loadDashboardData();
    this.loadAppConfig();
    this.subscribeToNotifications();
    this.startTypingAnimation();
  }

  ngAfterViewInit(): void {}

  /**
   * Load mobile app configuration status
   */
  private loadAppConfig(): void {
    this.appConfigService.getMobileAppStatus().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.mobileAppEnabled = response.data.mobile_app_enabled;
        }
      },
      error: (error) => {
        console.error('Failed to load app config:', error);
      }
    });
  }

  /**
   * Subscribe to notifications stream
   */
  private subscribeToNotifications(): void {
    this.notificationService.notifications$.subscribe(notifications => {
      this.recentNotifications = notifications.slice(0, 5);
      this.unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
    });
  }

  /**
   * Get relative time for notifications
   */
  getRelativeTime(timestamp: string): string {
    return this.notificationService.getRelativeTime(timestamp);
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type: string): string {
    return type === 'report' ? 'report_problem' : 'feedback';
  }

  /**
   * Navigate to notification details
   */
  onNotificationClick(notification: AppNotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greeting = 'صباح الخير';
    } else if (hour >= 12 && hour < 17) {
      this.greeting = 'مساء الخير';
    } else {
      this.greeting = 'مساء الخير';
    }
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

      setTimeout(type, typeSpeed);
    };

    type();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      users: this.usersService.getUsers(),
      fees: this.feesService.getFees(),
      reports: this.reportsService.getReports(),
      brands: this.brandsService.getBrands(),
      models: this.brandsService.getModels(),
      chargers: this.chargersService.getChargers(),
      vehicles: this.vehiclesService.getVehicles(),
      complaints: this.complaintsService.getComplaints({ includeResolved: true }),
      complaintCategories: this.complaintCategoriesService.getCategories({ includeDeleted: false }),
      processes: this.processesService.getProcesses()
    }).subscribe({
      next: (results) => {
        if (results.users.status && results.users.data) {
          const users = results.users.data;
          this.stats.totalUsers = users.length;
          this.stats.activeUsers = users.filter(u => !u.isBanned).length;
          this.stats.bannedUsers = users.filter(u => u.isBanned).length;

          const ratings = users.filter(u => u.rating > 0).map(u => u.rating);
          this.stats.averageRating = ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0;
        }

        if (results.fees.status && results.fees.data) {
          this.stats.currentFees = results.fees.data.percentage;
        }

        if (results.reports.status && results.reports.data) {
          const reports = results.reports.data;
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

        if (results.brands.status && results.brands.data) {
          this.stats.totalBrands = results.brands.data.length;
        }
        if (results.models.status && results.models.data) {
          this.stats.totalModels = results.models.data.length;
        }

        if (results.chargers.status && results.chargers.data) {
          this.stats.totalChargers = results.chargers.data.length;
        }

        if (results.vehicles.status && results.vehicles.data) {
          this.stats.totalVehicles = results.vehicles.data.length;
        }

        // Complaints stats
        if (results.complaints.status && results.complaints.data) {
          const complaints = results.complaints.data;
          this.stats.totalComplaints = complaints.length;
          this.stats.pendingComplaints = complaints.filter(c => !c.isResolved).length;
          this.stats.resolvedComplaints = complaints.filter(c => c.isResolved).length;
        }

        // Complaint categories stats
        if (results.complaintCategories.status && results.complaintCategories.data) {
          this.stats.totalComplaintCategories = results.complaintCategories.data.length;
        }

        // Processes stats
        if (results.processes.status && results.processes.data) {
          this.stats.totalProcesses = results.processes.data.length;
        }

        this.updateCharts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  private updateCharts(): void {
    this.overviewChartData = {
      ...this.overviewChartData,
      datasets: [{
        ...this.overviewChartData.datasets[0],
        data: [this.stats.totalUsers, this.stats.totalChargers, this.stats.totalVehicles, this.stats.totalReports]
      }]
    };

    this.reportsChartData = {
      ...this.reportsChartData,
      datasets: [{
        ...this.reportsChartData.datasets[0],
        data: [this.stats.pendingReports, this.stats.resolvedReports]
      }]
    };
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;

    return date.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric'
    });
  }
}
