import { Routes } from '@angular/router';

export const usersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./users-list/users-list.component').then(m => m.UsersListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./user-details/user-details.component').then(m => m.UserDetailsComponent)
  }
];
