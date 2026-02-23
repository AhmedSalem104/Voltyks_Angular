// Production Environment Configuration
export const environment = {
  production: true,
  // API Base URL - Direct connection to Azure backend
  apiBaseUrl: 'https://voltyks.runasp.net',
  // Disable SignalR in production - Vercel doesn't support WebSockets
  // Uses polling fallback instead for real-time notifications
  enableSignalR: false,
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
      processes: '/api/admin/process',
      complaintCategories: '/api/admin/complaint-categories',
      complaints: '/api/admin/complaints'
    },
    auth: {
      generalComplaints: '/api/auth/general-complaints'
    }
  }
};
