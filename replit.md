# Business Operating System (BizOS)

## Overview

BizOS is a comprehensive business management platform built as a modern web application. It consolidates multiple business functions into a unified system including client relationship management (CRM), project management with client portals, team management, financial tracking, knowledge management, marketing campaigns, and administrative controls. The application is designed as a professional-grade Business Operating System that provides real-time dashboards, role-based access control, and modern UI/UX with glassmorphism design patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom design system using CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible components
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom theme provider supporting light/dark/system themes with persistent storage

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: OpenID Connect integration with Replit Auth using Passport.js strategy
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple
- **API Design**: RESTful API with role-based route protection middleware

### Database Layer
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with type-safe schema definitions and migrations
- **Schema Design**: Comprehensive business entity models including users, clients, projects, tasks, invoices, expenses, documents, knowledge articles, marketing campaigns, support tickets, and time tracking

### Authentication & Authorization
- **Provider**: Replit OpenID Connect (OIDC) with automatic user provisioning
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role System**: Multi-tier access control (Admin, Manager, Employee, Client roles)
- **Security**: HTTP-only cookies, CSRF protection, and secure session configuration
- **Multi-Tenant Integration**: New OAuth users are automatically assigned to default organization (slug='default') with member role upon first login
- **Middleware Architecture**: Public auth routes (`/api/login`, `/api/callback`, `/api/auth/register`, etc.) bypass authentication middleware while all other `/api/*` routes require authentication and tenant context

### Development Architecture
- **Build System**: Vite with React plugin for frontend, esbuild for backend bundling
- **Type Safety**: Shared TypeScript schemas between frontend and backend using Zod validation
- **Path Resolution**: Custom module aliases for clean imports (@/, @shared/, @assets/)
- **Development Tools**: Runtime error overlay, cartographer, and dev banner for Replit environment

### Port Allocation Strategy

**CRITICAL: To prevent port conflicts between Claude Code and Replit Agent, both agents MUST follow this unified port allocation strategy.**

#### Port Assignment Rules
- **Replit Environment**: Always use port **5000** (automatically detected via `REPL_ID` or `REPLIT_ENV`)
- **Local Development**: Always use port **3001**
- **Production**: Always use port **5000**

#### Environment Detection Logic
The server automatically detects the environment and assigns the correct port:
```typescript
// Environment detection (in server/index.ts)
const isReplit = process.env.REPL_ID !== undefined || process.env.REPLIT_ENV === 'true';

if (Number.isFinite(rawPort) && rawPort > 0) {
  port = rawPort; // Use explicit PORT environment variable
} else if (isReplit) {
  port = 5000; // Force port 5000 in Replit environment
} else {
  port = isDevMode ? 3001 : 5000; // Local dev: 3001, Production: 5000
}
```

#### Workflow Management Protocol
1. **Before starting development**: Always use `restart_workflow` tool to cleanly restart the "Start application" workflow
2. **If port conflicts occur**: The server has built-in single-instance enforcement with lock files (`.server.lock`)
3. **Process cleanup**: If "Server already running" error appears, the existing process must be terminated before starting new one

#### Critical Implementation Details
- **Single Instance Enforcement**: Server uses PID-based lock files to prevent multiple instances
- **WebSocket Port Binding**: WebSocket server shares the same port as the HTTP server (unified approach)
- **Vite HMR Configuration**: Uses middleware mode with the main server instance for Hot Module Replacement
- **Process Binding**: Server binds to `0.0.0.0:{port}` to ensure proper EADDRINUSE errors on conflicts

#### Agent Collaboration Guidelines
- **Never start multiple server instances simultaneously**
- **Always check workflow status before making server changes** 
- **Use the restart_workflow tool instead of manual npm commands**
- **Respect the existing server lock mechanism**
- **In Replit, always use port 5000 - never override to other ports**

This strategy ensures that both Claude Code and Replit Agent can work on the same project without port conflicts or server instance collisions.

### Module Structure
The application follows a modular architecture with distinct functional areas:
- **Foundation**: Authentication, navigation, theming, and core layout components
- **Executive Dashboard**: Real-time KPIs, alerts system, activity feeds, and data visualizations
- **Client Management**: Complete CRM with lead pipeline, interaction history, and satisfaction tracking
- **Project Management**: Portfolio tracking with integrated client portals for project visibility
- **Team Management**: Employee directory, time tracking, task assignment, and performance metrics
- **Financial Management**: Invoice generation, payment tracking, expense management, and financial reporting
- **Knowledge Hub**: Centralized documentation, SOPs, and training materials with search capabilities
- **Marketing**: Campaign planning, content calendar, ROI tracking, and marketing analytics
- **Support System**: Ticket management, customer support tracking, and resolution workflows
- **Admin Portal**: User management, system configuration, analytics, and administrative controls

## External Dependencies

### Database & Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle Kit**: Database migration and schema management tooling

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider for seamless user management
- **connect-pg-simple**: PostgreSQL session store for persistent authentication sessions

### UI & Design System
- **Radix UI**: Headless UI primitives for accessible component foundation
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library providing consistent iconography throughout the application

### Development & Build Tools
- **Vite**: Frontend build tool with hot module replacement and optimized production builds
- **TanStack Query**: Data fetching and caching library for efficient server state management
- **TypeScript**: Type safety across the entire application stack
- **Zod**: Runtime type validation for API contracts and form validation

### Monitoring & Development
- **Replit Dev Tools**: Development banner, cartographer, and runtime error handling for enhanced development experience