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

### Development Architecture
- **Build System**: Vite with React plugin for frontend, esbuild for backend bundling
- **Type Safety**: Shared TypeScript schemas between frontend and backend using Zod validation
- **Path Resolution**: Custom module aliases for clean imports (@/, @shared/, @assets/)
- **Development Tools**: Runtime error overlay, cartographer, and dev banner for Replit environment

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