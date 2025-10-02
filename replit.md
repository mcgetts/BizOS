# Business Operating System (BizOS)

## Overview

BizOS is a comprehensive business management platform designed as a modern web application. It integrates CRM, project management with client portals, team management, financial tracking, knowledge management, marketing campaigns, and administrative controls into a unified system. BizOS aims to be a professional-grade Business Operating System, offering real-time dashboards, role-based access control, and a modern UI/UX featuring glassmorphism design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design System**: Glassmorphism aesthetic.
- **Styling**: Tailwind CSS with a custom design system using CSS variables.
- **UI Components**: Radix UI primitives and shadcn/ui for consistent, accessible components.
- **Theme System**: Custom provider supporting light/dark/system themes with persistent storage.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite for bundling, TanStack Query for server state, and Wouter for routing.
- **Backend**: Node.js with Express.js and TypeScript.
- **Database**: PostgreSQL with Neon serverless hosting, Drizzle ORM for type-safe schema and migrations.
- **Authentication**: OpenID Connect with Replit Auth (Passport.js), Express sessions with PostgreSQL store, and role-based route protection.
- **Multi-Tenancy**: Subdomain-based routing, `resolveTenant` middleware, AsyncLocalStorage for tenant context, automatic `organizationId` injection and filtering for data isolation, and tenant-scoped database operations.
- **Port Allocation**: Unified strategy: 5000 for Replit/Production, 3001 for local development.

### Feature Specifications
- **Core Modules**: Executive Dashboard, Client Management (CRM), Project Management (with client portals), Team Management, Financial Management, Knowledge Hub, Marketing, Support System, and Admin Portal.
- **Access Control**: Multi-tier role system (Admin, Manager, Employee, Client).
- **Data Isolation**: All database operations are tenant-scoped, ensuring zero cross-tenant data leakage.
- **Organization Management**: Users can belong to multiple organizations with different roles.

### System Design Choices
- **Modular Architecture**: Distinct functional areas for better organization and maintainability.
- **API Design**: RESTful API with robust role-based protection.
- **Development Tools**: Vite, esbuild, TypeScript, Zod for shared schemas, and custom path aliases.
- **Process Management**: Single-instance enforcement using lock files to prevent server conflicts.

## External Dependencies

### Database & Storage
- **Neon PostgreSQL**: Serverless PostgreSQL.
- **Drizzle Kit**: Migration and schema management.

### Authentication Services
- **Replit OIDC**: OpenID Connect provider.
- **connect-pg-simple**: PostgreSQL session store.

### UI & Design System
- **Radix UI**: Headless UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### Development & Build Tools
- **Vite**: Frontend build tool.
- **TanStack Query**: Data fetching and caching.
- **TypeScript**: Type safety.
- **Zod**: Runtime type validation.

### Monitoring & Development
- **Replit Dev Tools**: Development banner, cartographer, and error handling.