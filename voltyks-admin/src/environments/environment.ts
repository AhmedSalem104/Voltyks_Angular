// Development Environment Configuration
export const environment = {
  production: false,
  // API Base URL - Direct backend server
  apiBaseUrl: 'http://voltyks-app.runasp.net',
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
