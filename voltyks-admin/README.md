<div align="center">

# ⚡ Voltyks Admin Panel

<img src="https://img.shields.io/badge/Angular-20-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular 20"/>
<img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/RxJS-7.8-B7178C?style=for-the-badge&logo=reactivex&logoColor=white" alt="RxJS"/>
<img src="https://img.shields.io/badge/Chart.js-4.5-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js"/>

<br/><br/>

**Modern Admin Dashboard for EV Charging Platform Management**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API](#-api-integration) • [Screenshots](#-screenshots)

---

</div>

## 📋 Overview

Voltyks Admin Panel is a comprehensive management dashboard for the Voltyks EV charging platform. Built with **Angular 20** using standalone components and the latest control flow syntax (`@if`, `@for`, `@switch`), it provides a powerful interface for managing users, chargers, vehicles, transactions, and more.

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 Dashboard & Analytics
- Real-time statistics overview
- Interactive charts with Chart.js
- Quick access to all modules
- Activity monitoring

### 👥 User Management
- Complete user CRUD operations
- User details with wallet info
- Chargers & vehicles per user
- Account status management

### 🔌 Charger Management
- Charger registration & tracking
- Location-based management
- Availability status
- Usage statistics

</td>
<td width="50%">

### 🚗 Vehicle Management
- Vehicle registration
- Brand & model association
- User vehicle assignments
- Fleet overview

### 💳 Transaction Management
- Process/transaction tracking
- Detailed transaction view
- Status management
- Financial reporting

### 📝 Content Management
- Terms & Conditions (JSON Editor)
- Protocol management
- Multi-language support (AR/EN)
- Dynamic content updates

</td>
</tr>
</table>

### Additional Modules

| Module | Description |
|--------|-------------|
| 🏷️ **Brands & Models** | Manage EV brands and their models |
| 💰 **Fees Management** | Configure platform fees and pricing |
| 📊 **Reports** | Generate and export reports |
| 📢 **Complaints** | Handle user complaints with categories |
| ℹ️ **About** | Platform information management |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Angular CLI** 20.x

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/voltyks-angular.git

# Navigate to admin panel
cd voltyks-angular/voltyks-admin

# Install dependencies
npm install

# Start development server
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server at `http://localhost:4200` |
| `npm run build` | Production build |
| `npm run build:github` | Build for GitHub Pages deployment |
| `npm run watch` | Build with watch mode |
| `npm test` | Run unit tests |

## 🏗️ Architecture

```
voltyks-admin/
├── src/
│   ├── app/
│   │   ├── core/                    # Core functionality
│   │   │   ├── guards/              # Route guards (Auth)
│   │   │   ├── interceptors/        # HTTP interceptors
│   │   │   ├── models/              # TypeScript interfaces/DTOs
│   │   │   └── services/            # API services
│   │   │       └── admin/           # Admin-specific services
│   │   │
│   │   ├── features/                # Feature modules
│   │   │   ├── auth/                # Login & Forgot Password
│   │   │   ├── dashboard/           # Main dashboard
│   │   │   ├── users/               # User management
│   │   │   ├── chargers/            # Charger management
│   │   │   ├── vehicles/            # Vehicle management
│   │   │   ├── processes/           # Transactions
│   │   │   ├── brands/              # Brand management
│   │   │   ├── models/              # Model management
│   │   │   ├── fees/                # Fee configuration
│   │   │   ├── terms/               # Terms & Conditions
│   │   │   ├── protocol/            # Protocol management
│   │   │   ├── reports/             # Reporting
│   │   │   ├── complaints/          # Complaint categories
│   │   │   ├── complaints-list/     # All complaints
│   │   │   └── about/               # About page
│   │   │
│   │   ├── layout/                  # Layout components
│   │   │   ├── sidebar/             # Navigation sidebar
│   │   │   └── main-layout/         # Main app layout
│   │   │
│   │   └── shared/                  # Shared components
│   │       └── components/
│   │           ├── pagination/      # Reusable pagination
│   │           ├── loading-overlay/ # Loading indicator
│   │           └── toaster/         # Toast notifications
│   │
│   ├── environments/                # Environment configs
│   └── styles.scss                  # Global styles
│
├── proxy.conf.json                  # API proxy configuration
└── angular.json                     # Angular workspace config
```

## 🔌 API Integration

### Configuration

The app uses Angular's proxy for API requests during development:

```json
// proxy.conf.json
{
  "/api": {
    "target": "http://voltyks-app.runasp.net",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### API Endpoints Structure

```
/api/admin/
├── users              # User management
├── chargers           # Charger management
├── vehicles           # Vehicle management
├── brands             # Brand management
├── fees               # Fee configuration
├── terms              # Terms & Conditions
├── protocol           # Protocol content
├── reports            # Reports generation
├── process            # Transaction management
├── complaints         # Complaints handling
└── complaint-categories # Complaint types

/api/auth/
├── login              # Authentication
├── forgot-password    # Password recovery
└── general-complaints # User complaints
```

## 🎨 UI/UX Features

- 🌐 **RTL Support** - Full Arabic language support with right-to-left layout
- 🌙 **Dark Theme** - Modern dark color scheme optimized for long sessions
- 📱 **Responsive Design** - Seamless experience across all devices
- 🎯 **Material Icons** - Google Material Design icon system
- ✨ **Smooth Animations** - CSS transitions and Angular animations
- 🔔 **Toast Notifications** - Real-time user feedback system
- ⏳ **Loading States** - Skeleton loaders and overlay indicators

## 🔐 Authentication

- JWT-based authentication
- Token stored in localStorage
- Auto-redirect on session expiry
- Protected routes with AuthGuard

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@angular/core` | ^20.3.0 | Core framework |
| `@angular/material` | ^20.2.13 | UI components |
| `@angular/cdk` | ^20.2.13 | Component Dev Kit |
| `chart.js` | ^4.5.1 | Charts & graphs |
| `ng2-charts` | ^8.0.0 | Angular Chart.js wrapper |
| `ngx-json-viewer` | ^3.2.1 | JSON visualization |
| `rxjs` | ~7.8.0 | Reactive extensions |

## 🌐 Browser Support

| <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png" alt="Chrome" width="24"/> | <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_48x48.png" alt="Firefox" width="24"/> | <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/safari/safari_48x48.png" alt="Safari" width="24"/> | <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png" alt="Edge" width="24"/> |
|:---:|:---:|:---:|:---:|
| Latest ✅ | Latest ✅ | Latest ✅ | Latest ✅ |

## 🛠️ Development

### Code Style

This project uses **Prettier** for code formatting:

```json
{
  "printWidth": 100,
  "singleQuote": true
}
```

### Building for Production

```bash
# Standard production build
npm run build

# GitHub Pages deployment
npm run build:github
```

### Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: '',
  apiEndpoints: {
    admin: { /* ... */ },
    auth: { /* ... */ }
  }
};
```

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">

**Built with ❤️ by the Voltyks Team**

<br/>

<img src="https://img.shields.io/badge/Made%20with-Angular-DD0031?style=flat-square&logo=angular" alt="Made with Angular"/>
<img src="https://img.shields.io/badge/Powered%20by-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="Powered by TypeScript"/>

</div>
