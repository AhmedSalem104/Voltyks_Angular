import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public routes (no authentication required)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forget-password',
    loadComponent: () => import('./features/auth/forget-password/forget-password.component').then(m => m.ForgetPasswordComponent)
  },

  // Protected routes (authentication required)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then(m => m.usersRoutes)
      },
      {
        path: 'fees',
        loadComponent: () => import('./features/fees/fees.component').then(m => m.FeesComponent)
      },
      {
        path: 'terms',
        loadComponent: () => import('./features/terms/terms.component').then(m => m.TermsComponent)
      },
      {
        path: 'protocol',
        loadComponent: () => import('./features/protocol/protocol.component').then(m => m.ProtocolComponent)
      },
      {
        path: 'brands',
        loadComponent: () => import('./features/brands/brands.component').then(m => m.BrandsComponent)
      },
      {
        path: 'models',
        loadComponent: () => import('./features/models/models.component').then(m => m.ModelsComponent)
      },
      {
        path: 'processes',
        loadComponent: () => import('./features/processes/processes.component').then(m => m.ProcessesComponent)
      },
      {
        path: 'chargers',
        loadComponent: () => import('./features/chargers/chargers.component').then(m => m.ChargersComponent)
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./features/vehicles/vehicles').then(m => m.VehiclesComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'complaint-categories',
        loadComponent: () => import('./features/complaints/complaints.component').then(m => m.ComplaintsComponent)
      },
      {
        path: 'complaints',
        loadComponent: () => import('./features/complaints-list/complaints-list.component').then(m => m.ComplaintsListComponent)
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent)
      },
      {
        path: 'charging-protocols',
        loadComponent: () => import('./features/charging-protocols/charging-protocols.component').then(m => m.ChargingProtocolsComponent)
      },
      {
        path: 'capacities',
        loadComponent: () => import('./features/capacities/capacities.component').then(m => m.CapacitiesComponent)
      },
      {
        path: 'app-config',
        loadComponent: () => import('./features/app-config/app-config.component').then(m => m.AppConfigComponent)
      },
      {
        path: 'store',
        loadChildren: () => import('./features/store/store.routes').then(m => m.storeRoutes)
      }
    ]
  },

  // Redirect all unknown routes to dashboard
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
