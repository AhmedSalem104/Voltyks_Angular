// Production Environment Configuration
export const environment = {
  production: true,
  // Backend URL
  backendUrl: 'http://voltyks-app.runasp.net',
  // CORS proxy - using corsproxy.io which works from browser
  corsProxy: 'https://corsproxy.io/?',
  // API base URL - empty, handled by getApiUrl in services
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
