# Business Platform System

> **Enterprise-grade business management platform with AI-powered analytics, mobile-first design, and comprehensive third-party integrations**

[![CI Pipeline](https://github.com/your-org/business-platform/workflows/CI%20Pipeline/badge.svg)](https://github.com/your-org/business-platform/actions/workflows/ci.yml)
[![Deploy to Production](https://github.com/your-org/business-platform/workflows/Deploy%20to%20Production/badge.svg)](https://github.com/your-org/business-platform/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/your-org/business-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/business-platform)

## 🚀 **System Overview**

This is a comprehensive **multi-tenant SaaS business management platform** featuring 10 completed phases of development:

### **Phase 1: Project Management Foundation ✅**
- **Multi-Method Authentication**: Local email/password + OAuth integration
- **Advanced Project Management**: Gantt charts, task dependencies, critical path analysis
- **Real-time Communication**: WebSocket notifications, project comments, activity logging

### **Phase 2: Budget & Resource Management ✅**
- **Complete Budget Management**: Real-time cost tracking, variance analysis, automated billing
- **Time Tracking Integration**: Live budget impact calculations during timer sessions
- **Financial Analytics**: Profitability analysis, cash flow monitoring, expense tracking

### **Phase 3: AI-Powered Business Intelligence ✅**
- **Advanced Analytics Dashboard**: 5 comprehensive modules with predictive insights
- **AI Business Insights**: Machine learning analysis with strategic recommendations
- **Executive KPIs**: 6 key metrics with real-time trend analysis and goal tracking

### **Phase 4: Mobile & Integration Platform ✅**
- **Mobile-First Design**: Complete touch optimization with responsive layouts
- **Slack Integration**: Real-time notifications, daily digests, webhook support
- **Microsoft Teams Integration**: Adaptive Card notifications with rich formatting
- **GitHub Integration**: Automatic issue creation, repository sync, commit activity tracking

### **Phase 5: Enhanced Project-Task Integration ✅**
- **Smart Progress Automation**: ML-powered progress calculation with intelligent status suggestions
- **Bi-directional Quick Actions**: Seamless task creation and rich project context navigation
- **Advanced Dependency Management**: Comprehensive visualization with circular detection and critical path analysis

### **Phase 6: Advanced Task Management Platform ✅**
- **Integrated Time Tracking**: Real-time timer functionality with budget impact calculations
- **Task-Specific Notifications**: Granular notification preferences with burnout risk assessment
- **Mobile-First Task Management**: Touch-optimized drag & drop with gesture-based interactions
- **AI-Powered Task Analytics**: 5-module productivity dashboard with efficiency scoring
- **Enterprise Task Templates**: 16+ categorized templates across multiple workflow types
- **Project Health Intelligence**: Real-time health scoring with visual risk indicators

### **Phase 7: Enhanced Security & Access Control ✅**
- **Enterprise RBAC System**: Department-based permissions with 9 departments and 70+ resources
- **Multi-Factor Authentication**: TOTP and SMS-based authentication with backup codes
- **Advanced Session Management**: Concurrent session limits with device fingerprinting
- **Comprehensive Audit Logging**: Security event tracking with risk scoring and compliance
- **Permission Exception Handling**: Temporary elevated access with approval workflows

### **Phase 8: Project Management Reliability ✅**
- **Schema Validation**: Dedicated schemas for partial updates with server-authoritative mutations
- **Intelligent Deletion Logic**: Protection for incomplete work with cascade safeguards
- **Enhanced Error Handling**: Actionable error messages with consistent serialization

### **Phase 9: Executive Dashboard ✅**
- **Customer Intelligence**: Real-time client health monitoring with AI-powered upsell identification
- **Strategic Portfolio Management**: Project health indicators, budget utilization tracking
- **Business Health Score**: 6 strategic KPIs with real-time financial performance metrics
- **Critical Actions Center**: Role-based access for super admin and admin users

### **Phase 10: Multi-Tenant SaaS Architecture ✅ (Production Deployed)**
- **Subdomain-Based Routing**: Automatic tenant resolution from URL (e.g., acme.yourdomain.com)
- **Organization Management**: Complete organization lifecycle with plan tiers and billing
- **Data Isolation**: AsyncLocalStorage-based tenant context for thread-safe request isolation
- **Automatic Filtering**: Tenant-scoped database queries with organizationId enforcement
- **Organization Members**: User-organization junction table with role-based access (owner, admin, member)
- **Migration Tools**: Scripts for single-tenant to multi-tenant conversion
- **Replit Deployment**: Production-ready deployment on Replit autoscale infrastructure

## 🛠 **Technology Stack**

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Radix UI, Wouter |
| **Backend** | Node.js, Express, TypeScript, Drizzle ORM |
| **Database** | PostgreSQL with Drizzle migrations |
| **Authentication** | Passport.js (Local + OAuth), bcrypt, session management |
| **Security** | Speakeasy (TOTP), Twilio (SMS), RBAC middleware, Audit logging |
| **Real-time** | WebSocket integration, live notifications |
| **Testing** | Vitest, Playwright, Testing Library |
| **Build** | Vite, esbuild, TypeScript compiler |
| **Integrations** | Slack API, Microsoft Teams, GitHub API, Stripe |
| **Monitoring** | Sentry, Uptime monitoring, Health checks |

## 🚦 **Getting Started**

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 15+
- **npm** or **yarn**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/business-platform.git
   cd business-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   **Required Environment Variables:**
   ```bash
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/business_platform

   # Authentication
   SESSION_SECRET=your-secure-session-secret

   # Optional: Multi-Factor Authentication (SMS)
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_FROM_PHONE=+1234567890

   # Optional: Error Monitoring
   SENTRY_DSN=your-sentry-dsn
   SENTRY_ENABLED=true
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev:safe
   ```

6. **Access the application**
   - Frontend: http://localhost:3001
   - API: http://localhost:3001/api

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev:safe` | 🔧 **Recommended**: Complete cleanup + conflict-free startup |
| `npm run dev:clean` | 🧹 Manual cleanup + standard startup |
| `npm run dev` | ⚡ Direct startup (use only when environment is clean) |
| `npm run build` | 📦 Build for production |
| `npm run test` | 🧪 Run test suite |
| `npm run test:e2e` | 🎭 Run end-to-end tests |
| `npm run check` | 🔍 TypeScript type checking |

### Key API Endpoints

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Authentication** | `/api/auth/*` | Login, registration, password reset, MFA |
| **Multi-Factor Auth** | `/api/mfa/*` | TOTP setup, SMS verification, backup codes |
| **Session Management** | `/api/sessions/*` | Active sessions, session limits, cleanup |
| **Projects** | `/api/projects/*` | Project CRUD, templates, progress tracking |
| **Tasks** | `/api/tasks/*` | Task management, dependencies, time tracking |
| **Analytics** | `/api/analytics/*` | Business intelligence, KPIs, productivity |
| **Integrations** | `/api/integrations/*` | Slack, Teams, GitHub connectivity |

## 📊 **System Features**

### **Core Business Modules**
- **📈 Analytics Dashboard**: AI-powered insights with 5 specialized modules
- **🏗️ Project Management**: Professional Gantt charts with dependency visualization
- **💰 Sales Management**: CRM with pipeline tracking and opportunity management
- **✅ Task Management**: Smart automation with bi-directional workflows
- **⏱️ Time Tracking**: Real-time budget integration and billing automation
- **💵 Budget Management**: Variance analysis and automated invoice generation
- **👥 Team Management**: Performance monitoring and resource allocation
- **📚 Knowledge Base**: Documentation and support systems

### **Advanced Capabilities**
- **🤖 AI Business Intelligence**: Predictive analytics and strategic recommendations
- **📱 Mobile-First Design**: Touch-optimized interfaces across all devices
- **🔗 Third-Party Integrations**: Slack, Microsoft Teams, and GitHub connectivity
- **🔐 Enterprise Security**: Multi-factor authentication with intelligent rate limiting
- **⚡ Real-time Operations**: WebSocket integration with live data updates

## 🏗️ **Architecture**

### **Database Schema**
- **30+ tables** with full normalization and multi-tenant organizationId columns
- **Organizations & Memberships**: Root tenant tables with user-organization relationships
- **Comprehensive relationships** with foreign key constraints and cascade deletes
- **Type-safe migrations** using Drizzle ORM
- **Centralized constants** for data consistency
- **Tenant isolation** via AsyncLocalStorage and automatic query filtering

### **API Design**
- **75+ REST endpoints** with full authentication and tenant context
- **Service boundaries** aligned with business domains
- **Tenant middleware** for automatic subdomain resolution and organization validation
- **Comprehensive validation** using Zod schemas
- **Rate limiting** and security middleware

### **Frontend Architecture**
- **50+ React components** with consistent patterns
- **Mobile-responsive design** with touch optimization
- **Component library** using Radix UI primitives
- **State management** with TanStack Query

## 🔧 **Development**

### **Project Structure**
```
├── client/src/           # Frontend React application
│   ├── components/       # Reusable UI components
│   ├── pages/           # Application pages/routes
│   ├── lib/             # Utility functions and hooks
│   └── hooks/           # Custom React hooks
├── server/              # Backend Express application
│   ├── routes.ts        # API route definitions
│   ├── integrations/    # Third-party service integrations
│   └── utils/           # Server utilities and middleware
├── shared/              # Shared TypeScript types and schemas
├── docs/                # Comprehensive YAML DSL documentation
├── scripts/             # Database migrations and utilities
└── .github/             # GitHub workflows and templates
```

### **Contributing**
Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on:
- Code standards and conventions
- Development workflow
- Testing requirements
- Pull request process

### **Security**
For security vulnerabilities, please see our [Security Policy](SECURITY.md).

## 📋 **Documentation**

### **System Documentation**
- **[📁 Architecture Overview](docs/README.md)**: Complete system blueprint
- **[🗄️ Database Schema](docs/technical/database-schema.yaml)**: Data model specifications
- **[🔌 API Documentation](docs/technical/api-endpoints.yaml)**: REST API reference
- **[🧩 Component Library](docs/technical/frontend-components.yaml)**: UI component guide
- **[🔐 Security Guide](docs/technical/security-auth.yaml)**: Authentication and security

### **Integration Guides**
- **[💬 Slack Integration](docs/integrations/slack-setup.md)**: Setup and configuration
- **[🔗 Teams Integration](docs/integrations/teams-setup.md)**: Microsoft Teams connectivity
- **[🐙 GitHub Integration](docs/integrations/github-setup.md)**: Repository automation

## 🚀 **Deployment**

### **Environment Setup**
1. **Production Environment**: Configured for scalability and security
2. **Staging Environment**: Mirror of production for testing
3. **Development Environment**: Local development with hot reloading

### **Deployment Methods**
- **Automated CI/CD**: GitHub Actions with comprehensive testing
- **Database Migrations**: Automated schema updates
- **Health Monitoring**: Post-deployment validation and rollback capabilities

## 📈 **Performance**

- **⚡ Optimized Build**: esbuild and Vite for fast compilation
- **📱 Mobile Performance**: Touch-optimized interfaces with gesture support
- **🔄 Real-time Updates**: WebSocket integration for live data
- **📊 Analytics Integration**: Performance monitoring and business intelligence

## 🤝 **Support**

- **📖 Documentation**: Comprehensive guides in `/docs`
- **🐛 Bug Reports**: Use GitHub Issues with provided templates
- **💡 Feature Requests**: Submit enhancement proposals
- **💬 Community**: Join our discussion forums

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 **Quick Links**

| Resource | Link |
|----------|------|
| 🚀 **Live Demo** | [https://yourdomain.com](https://yourdomain.com) |
| 📖 **Documentation** | [docs/README.md](docs/README.md) |
| 🐛 **Report Bug** | [Create Issue](https://github.com/your-org/business-platform/issues/new?template=bug_report.md) |
| 💡 **Request Feature** | [Create Issue](https://github.com/your-org/business-platform/issues/new?template=feature_request.md) |
| 🔧 **Contributing** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 🔐 **Security** | [SECURITY.md](SECURITY.md) |

**🎉 Production-Ready Enterprise Platform with Intelligent Automation! 🚀📱🔗✨🎯**