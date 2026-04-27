import { Routes } from '@angular/router';

// Notification routes — three single-segment admin tooling routes plus the
// existing two-segment :type/:id detail route. Order matters: single-segment
// matches must precede the catch-all so /notifications/templates does NOT
// fall into NotificationDetailComponent.
export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: 'templates',
    loadComponent: () =>
      import('../notification-center/templates-list/templates-list.component').then(
        m => m.TemplatesListComponent
      ),
    title: 'Notification Templates'
  },
  {
    path: 'send-user',
    loadComponent: () =>
      import('../notification-center/send-to-user/send-to-user.component').then(
        m => m.SendToUserComponent
      ),
    title: 'Send Notification'
  },
  {
    path: 'broadcast',
    loadComponent: () =>
      import('../notification-center/broadcast/broadcast.component').then(
        m => m.BroadcastComponent
      ),
    title: 'Broadcast Notification'
  },
  {
    path: ':type/:id',
    loadComponent: () =>
      import('./notification-detail/notification-detail.component').then(
        m => m.NotificationDetailComponent
      ),
    title: 'Notification Details'
  }
];
