// Production Environment Configuration
export const environment = {
  production: true,
  // Backend URL (used by Vercel serverless proxy)
  backendUrl: 'http://voltyks-app.runasp.net',
  // No CORS proxy needed - using Vercel serverless function
  corsProxy: '',
  // API base URL - empty to use same origin (Vercel proxy)
  apiBaseUrl: '',
  apiEndpoints: {
    admin: {
      users: '/api/admin/users',
      brands: '/api/admin/brands',
      fees: '/api/admin/fees',
      terms: '/api/admin/terms',
      protocol: '/api/admin/protocol',
      reports: '/api/admin/reports',
      chargers: '/api/admin/chargers',
      vehicles: '/api/admin/vehicles',
      processes: '/api/admin/process'
    }
  }
};
