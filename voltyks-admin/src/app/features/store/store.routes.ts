import { Routes } from '@angular/router';

// Browser-tab titles — kept in English so the tab is readable regardless of UI language.
export const storeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./store-dashboard/store-dashboard.component')
      .then(m => m.StoreDashboardComponent),
    title: 'Store Management'
  },
  {
    path: 'categories',
    loadComponent: () => import('./store-categories/store-categories.component')
      .then(m => m.StoreCategoriesComponent),
    title: 'Store Categories'
  },
  {
    path: 'products',
    loadComponent: () => import('./store-products/store-products.component')
      .then(m => m.StoreProductsComponent),
    title: 'Store Products'
  },
  {
    path: 'reservations',
    loadComponent: () => import('./store-reservations/store-reservations.component')
      .then(m => m.StoreReservationsComponent),
    title: 'Store Reservations'
  }
];
