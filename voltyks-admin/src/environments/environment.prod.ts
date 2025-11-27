// Production Environment Configuration
export const environment = {
  production: true,
  // Backend URL - will be proxied through CORS proxy
  backendUrl: 'http://voltyks-app.runasp.net',
  // CORS proxy for HTTP to HTTPS conversion
  corsProxy: 'https://api.allorigins.win/raw?url=',
  // Combined API base URL (empty for now, handled in services)
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
