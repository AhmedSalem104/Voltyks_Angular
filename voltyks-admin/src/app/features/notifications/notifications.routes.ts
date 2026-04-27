import { Routes } from '@angular/router';

export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: ':type/:id',
    loadComponent: () => import('./notification-detail/notification-detail.component')
      .then(m => m.NotificationDetailComponent),
    title: 'Notification Details'
  }
];
