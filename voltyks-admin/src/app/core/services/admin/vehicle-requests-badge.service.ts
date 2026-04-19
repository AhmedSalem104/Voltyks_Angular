import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { VehicleAdditionRequestsService } from './vehicle-addition-requests.service';
import { NotificationService } from '../notification.service';
import { AuthService } from '../auth.service';

/**
 * Keeps a live count of pending vehicle-addition requests for the sidebar badge.
 * Updates via:
 *  - Initial fetch on app start
 *  - Subscription to the SignalR notification stream (event-driven refresh)
 *  - Polling every 60s as a safety net
 *  - Manual `refresh()` after admin actions (accept/decline)
 */
@Injectable({ providedIn: 'root' })
export class VehicleRequestsBadgeService implements OnDestroy {
  private pendingCountSubject = new BehaviorSubject<number>(0);
  public pendingCount$ = this.pendingCountSubject.asObservable();

  private subscriptions: Subscription[] = [];
  private started = false;

  constructor(
    private requestsService: VehicleAdditionRequestsService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  /**
   * Start listening. Idempotent — safe to call multiple times.
   */
  startRealtime(): void {
    if (this.started) return;
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) return;
    this.started = true;

    this.refresh();

    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(() => {
        this.refresh();
      })
    );

    this.subscriptions.push(
      timer(60000, 60000).subscribe(() => this.refresh())
    );
  }

  /**
   * Fetch the current pending count from the API.
   */
  refresh(): void {
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) return;

    this.requestsService.getAll('pending', 1, 1).subscribe({
      next: (res) => {
        if (res?.status && res.data) {
          this.pendingCountSubject.next(res.data.totalCount ?? 0);
        }
      },
      error: () => {
        // Silent fail — keep previous count
      }
    });
  }

  get currentCount(): number {
    return this.pendingCountSubject.value;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    this.started = false;
  }
}
