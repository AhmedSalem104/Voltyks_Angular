import { Routes } from '@angular/router';

export const storeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./store-dashboard/store-dashboard.component')
      .then(m => m.StoreDashboardComponent),
    title: 'ادارة المتجر'
  },
  {
    path: 'categories',
    loadComponent: () => import('./store-categories/store-categories.component')
      .then(m => m.StoreCategoriesComponent),
    title: 'فئات المتجر'
  },
  {
    path: 'products',
    loadComponent: () => import('./store-products/store-products.component')
      .then(m => m.StoreProductsComponent),
    title: 'منتجات المتجر'
  },
  {
    path: 'reservations',
    loadComponent: () => import('./store-reservations/store-reservations.component')
      .then(m => m.StoreReservationsComponent),
    title: 'حجوزات المتجر'
  }
];
