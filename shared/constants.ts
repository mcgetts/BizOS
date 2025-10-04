// Shared Data Constants for System-wide Consistency
// This file centralizes all dropdown values, enums, and shared data items

// Industry Categories
export const INDUSTRIES = {
  WEB_DEVELOPMENT: 'web_development',
  MARKETING: 'marketing',
  CONSULTING: 'consulting',
  DESIGN: 'design',
  ECOMMERCE: 'ecommerce',
  FINTECH: 'fintech',
  HEALTHCARE: 'healthcare',
  EDUCATION: 'education',
  MANUFACTURING: 'manufacturing',
  RETAIL: 'retail',
  REAL_ESTATE: 'real_estate',
  NON_PROFIT: 'non_profit'
} as const;

export type Industry = typeof INDUSTRIES[keyof typeof INDUSTRIES];

// Human-readable industry labels
export const INDUSTRY_LABELS: Record<Industry, string> = {
  [INDUSTRIES.WEB_DEVELOPMENT]: 'Web Development',
  [INDUSTRIES.MARKETING]: 'Marketing',
  [INDUSTRIES.CONSULTING]: 'Consulting',
  [INDUSTRIES.DESIGN]: 'Design',
  [INDUSTRIES.ECOMMERCE]: 'E-commerce',
  [INDUSTRIES.FINTECH]: 'Fintech',
  [INDUSTRIES.HEALTHCARE]: 'Healthcare',
  [INDUSTRIES.EDUCATION]: 'Education',
  [INDUSTRIES.MANUFACTURING]: 'Manufacturing',
  [INDUSTRIES.RETAIL]: 'Retail',
  [INDUSTRIES.REAL_ESTATE]: 'Real Estate',
  [INDUSTRIES.NON_PROFIT]: 'Non-Profit'
};

// Priority Levels (used across projects, tasks, templates, tickets)
export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export type Priority = typeof PRIORITIES[keyof typeof PRIORITIES];

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITIES.LOW]: 'Low',
  [PRIORITIES.MEDIUM]: 'Medium',
  [PRIORITIES.HIGH]: 'High',
  [PRIORITIES.URGENT]: 'Urgent'
};

// Priority colors for UI
export const PRIORITY_COLORS: Record<Priority, string> = {
  [PRIORITIES.LOW]: 'bg-gray-100 text-gray-800',
  [PRIORITIES.MEDIUM]: 'bg-blue-100 text-blue-800',
  [PRIORITIES.HIGH]: 'bg-orange-100 text-orange-800',
  [PRIORITIES.URGENT]: 'bg-red-100 text-red-800'
};

// Project Status Values
export const PROJECT_STATUSES = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  REVIEW: 'review',
  PAUSED: 'paused',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type ProjectStatus = typeof PROJECT_STATUSES[keyof typeof PROJECT_STATUSES];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [PROJECT_STATUSES.PLANNING]: 'Planning',
  [PROJECT_STATUSES.ACTIVE]: 'Active',
  [PROJECT_STATUSES.REVIEW]: 'Review',
  [PROJECT_STATUSES.PAUSED]: 'Paused',
  [PROJECT_STATUSES.ON_HOLD]: 'On Hold',
  [PROJECT_STATUSES.COMPLETED]: 'Completed',
  [PROJECT_STATUSES.CANCELLED]: 'Cancelled'
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  [PROJECT_STATUSES.PLANNING]: 'bg-purple-100 text-purple-800',
  [PROJECT_STATUSES.ACTIVE]: 'bg-green-100 text-green-800',
  [PROJECT_STATUSES.REVIEW]: 'bg-yellow-100 text-yellow-800',
  [PROJECT_STATUSES.PAUSED]: 'bg-orange-100 text-orange-800',
  [PROJECT_STATUSES.ON_HOLD]: 'bg-orange-100 text-orange-800',
  [PROJECT_STATUSES.COMPLETED]: 'bg-emerald-100 text-emerald-800',
  [PROJECT_STATUSES.CANCELLED]: 'bg-red-100 text-red-800'
};

// Task Status Values
export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed'
} as const;

export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TASK_STATUSES.TODO]: 'To Do',
  [TASK_STATUSES.IN_PROGRESS]: 'In Progress',
  [TASK_STATUSES.REVIEW]: 'Review',
  [TASK_STATUSES.COMPLETED]: 'Completed'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TASK_STATUSES.TODO]: 'bg-gray-100 text-gray-800',
  [TASK_STATUSES.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TASK_STATUSES.REVIEW]: 'bg-yellow-100 text-yellow-800',
  [TASK_STATUSES.COMPLETED]: 'bg-green-100 text-green-800'
};

// Support Ticket Status
export const TICKET_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_CUSTOMER: 'waiting_for_customer',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
} as const;

export type TicketStatus = typeof TICKET_STATUSES[keyof typeof TICKET_STATUSES];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TICKET_STATUSES.OPEN]: 'Open',
  [TICKET_STATUSES.IN_PROGRESS]: 'In Progress',
  [TICKET_STATUSES.WAITING_FOR_CUSTOMER]: 'Waiting for Customer',
  [TICKET_STATUSES.RESOLVED]: 'Resolved',
  [TICKET_STATUSES.CLOSED]: 'Closed'
};

// Project Template Categories
export const TEMPLATE_CATEGORIES = {
  WEBSITE: 'website',
  MOBILE_APP: 'mobile_app',
  CAMPAIGN: 'campaign',
  AUDIT: 'audit',
  BRANDING: 'branding',
  INTEGRATION: 'integration',
  CONSULTATION: 'consultation',
  MAINTENANCE: 'maintenance'
} as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[keyof typeof TEMPLATE_CATEGORIES];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TEMPLATE_CATEGORIES.WEBSITE]: 'Website',
  [TEMPLATE_CATEGORIES.MOBILE_APP]: 'Mobile App',
  [TEMPLATE_CATEGORIES.CAMPAIGN]: 'Campaign',
  [TEMPLATE_CATEGORIES.AUDIT]: 'Audit',
  [TEMPLATE_CATEGORIES.BRANDING]: 'Branding',
  [TEMPLATE_CATEGORIES.INTEGRATION]: 'Integration',
  [TEMPLATE_CATEGORIES.CONSULTATION]: 'Consultation',
  [TEMPLATE_CATEGORIES.MAINTENANCE]: 'Maintenance'
};

// Company Size Categories
export const COMPANY_SIZES = {
  STARTUP: 'startup',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  ENTERPRISE: 'enterprise'
} as const;

export type CompanySize = typeof COMPANY_SIZES[keyof typeof COMPANY_SIZES];

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  [COMPANY_SIZES.STARTUP]: 'Startup (1-10)',
  [COMPANY_SIZES.SMALL]: 'Small (11-50)',
  [COMPANY_SIZES.MEDIUM]: 'Medium (51-200)',
  [COMPANY_SIZES.LARGE]: 'Large (201-1000)',
  [COMPANY_SIZES.ENTERPRISE]: 'Enterprise (1000+)'
};

// User Roles (extending existing constants)
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CLIENT: 'client'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Helper functions for UI components
export const getIndustryLabel = (industry: Industry | string): string => {
  return INDUSTRY_LABELS[industry as Industry] || industry;
};

export const getPriorityLabel = (priority: Priority | string): string => {
  return PRIORITY_LABELS[priority as Priority] || priority;
};

export const getPriorityColor = (priority: Priority | string): string => {
  return PRIORITY_COLORS[priority as Priority] || 'bg-gray-100 text-gray-800';
};

export const getProjectStatusLabel = (status: ProjectStatus | string): string => {
  return PROJECT_STATUS_LABELS[status as ProjectStatus] || status;
};

export const getProjectStatusColor = (status: ProjectStatus | string): string => {
  return PROJECT_STATUS_COLORS[status as ProjectStatus] || 'bg-gray-100 text-gray-800';
};

export const getTaskStatusLabel = (status: TaskStatus | string): string => {
  return TASK_STATUS_LABELS[status as TaskStatus] || status;
};

export const getTaskStatusColor = (status: TaskStatus | string): string => {
  return TASK_STATUS_COLORS[status as TaskStatus] || 'bg-gray-100 text-gray-800';
};

// Arrays for dropdown options
export const INDUSTRY_OPTIONS = Object.entries(INDUSTRY_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const TEMPLATE_CATEGORY_OPTIONS = Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const COMPANY_SIZE_OPTIONS = Object.entries(COMPANY_SIZE_LABELS).map(([value, label]) => ({
  value,
  label
}));

// ============================================
// PRODUCT MANAGEMENT CONSTANTS
// ============================================

// Product Types
export const PRODUCT_TYPES = {
  INTERNAL: 'internal',
  CLIENT: 'client',
  SAAS: 'saas'
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  [PRODUCT_TYPES.INTERNAL]: 'Internal',
  [PRODUCT_TYPES.CLIENT]: 'Client',
  [PRODUCT_TYPES.SAAS]: 'SaaS'
};

// Product Status
export const PRODUCT_STATUSES = {
  DISCOVERY: 'discovery',
  DEVELOPMENT: 'development',
  LAUNCHED: 'launched',
  MAINTENANCE: 'maintenance',
  SUNSET: 'sunset'
} as const;

export type ProductStatus = typeof PRODUCT_STATUSES[keyof typeof PRODUCT_STATUSES];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  [PRODUCT_STATUSES.DISCOVERY]: 'Discovery',
  [PRODUCT_STATUSES.DEVELOPMENT]: 'Development',
  [PRODUCT_STATUSES.LAUNCHED]: 'Launched',
  [PRODUCT_STATUSES.MAINTENANCE]: 'Maintenance',
  [PRODUCT_STATUSES.SUNSET]: 'Sunset'
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  [PRODUCT_STATUSES.DISCOVERY]: 'bg-purple-100 text-purple-800',
  [PRODUCT_STATUSES.DEVELOPMENT]: 'bg-blue-100 text-blue-800',
  [PRODUCT_STATUSES.LAUNCHED]: 'bg-green-100 text-green-800',
  [PRODUCT_STATUSES.MAINTENANCE]: 'bg-yellow-100 text-yellow-800',
  [PRODUCT_STATUSES.SUNSET]: 'bg-gray-100 text-gray-800'
};

// Epic Status
export const EPIC_STATUSES = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type EpicStatus = typeof EPIC_STATUSES[keyof typeof EPIC_STATUSES];

export const EPIC_STATUS_LABELS: Record<EpicStatus, string> = {
  [EPIC_STATUSES.PLANNED]: 'Planned',
  [EPIC_STATUSES.IN_PROGRESS]: 'In Progress',
  [EPIC_STATUSES.COMPLETED]: 'Completed',
  [EPIC_STATUSES.CANCELLED]: 'Cancelled'
};

export const EPIC_STATUS_COLORS: Record<EpicStatus, string> = {
  [EPIC_STATUSES.PLANNED]: 'bg-gray-100 text-gray-800',
  [EPIC_STATUSES.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [EPIC_STATUSES.COMPLETED]: 'bg-green-100 text-green-800',
  [EPIC_STATUSES.CANCELLED]: 'bg-red-100 text-red-800'
};

// Feature Status
export const FEATURE_STATUSES = {
  BACKLOG: 'backlog',
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type FeatureStatus = typeof FEATURE_STATUSES[keyof typeof FEATURE_STATUSES];

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  [FEATURE_STATUSES.BACKLOG]: 'Backlog',
  [FEATURE_STATUSES.PLANNED]: 'Planned',
  [FEATURE_STATUSES.IN_PROGRESS]: 'In Progress',
  [FEATURE_STATUSES.IN_REVIEW]: 'In Review',
  [FEATURE_STATUSES.COMPLETED]: 'Completed',
  [FEATURE_STATUSES.CANCELLED]: 'Cancelled'
};

export const FEATURE_STATUS_COLORS: Record<FeatureStatus, string> = {
  [FEATURE_STATUSES.BACKLOG]: 'bg-gray-100 text-gray-800',
  [FEATURE_STATUSES.PLANNED]: 'bg-purple-100 text-purple-800',
  [FEATURE_STATUSES.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [FEATURE_STATUSES.IN_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [FEATURE_STATUSES.COMPLETED]: 'bg-green-100 text-green-800',
  [FEATURE_STATUSES.CANCELLED]: 'bg-red-100 text-red-800'
};

// Confidence Levels
export const CONFIDENCE_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

export type ConfidenceLevel = typeof CONFIDENCE_LEVELS[keyof typeof CONFIDENCE_LEVELS];

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  [CONFIDENCE_LEVELS.LOW]: 'Low',
  [CONFIDENCE_LEVELS.MEDIUM]: 'Medium',
  [CONFIDENCE_LEVELS.HIGH]: 'High'
};

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  [CONFIDENCE_LEVELS.LOW]: 'bg-red-100 text-red-800',
  [CONFIDENCE_LEVELS.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [CONFIDENCE_LEVELS.HIGH]: 'bg-green-100 text-green-800'
};

// Risk Levels
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];

export const RISK_LABELS: Record<RiskLevel, string> = {
  [RISK_LEVELS.LOW]: 'Low',
  [RISK_LEVELS.MEDIUM]: 'Medium',
  [RISK_LEVELS.HIGH]: 'High'
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  [RISK_LEVELS.LOW]: 'bg-green-100 text-green-800',
  [RISK_LEVELS.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [RISK_LEVELS.HIGH]: 'bg-red-100 text-red-800'
};

// Helper functions for Product Management
export const getProductStatusLabel = (status: ProductStatus | string): string => {
  return PRODUCT_STATUS_LABELS[status as ProductStatus] || status;
};

export const getProductStatusColor = (status: ProductStatus | string): string => {
  return PRODUCT_STATUS_COLORS[status as ProductStatus] || 'bg-gray-100 text-gray-800';
};

export const getEpicStatusLabel = (status: EpicStatus | string): string => {
  return EPIC_STATUS_LABELS[status as EpicStatus] || status;
};

export const getEpicStatusColor = (status: EpicStatus | string): string => {
  return EPIC_STATUS_COLORS[status as EpicStatus] || 'bg-gray-100 text-gray-800';
};

export const getFeatureStatusLabel = (status: FeatureStatus | string): string => {
  return FEATURE_STATUS_LABELS[status as FeatureStatus] || status;
};

export const getFeatureStatusColor = (status: FeatureStatus | string): string => {
  return FEATURE_STATUS_COLORS[status as FeatureStatus] || 'bg-gray-100 text-gray-800';
};

export const getConfidenceLabel = (level: ConfidenceLevel | string): string => {
  return CONFIDENCE_LABELS[level as ConfidenceLevel] || level;
};

export const getConfidenceColor = (level: ConfidenceLevel | string): string => {
  return CONFIDENCE_COLORS[level as ConfidenceLevel] || 'bg-gray-100 text-gray-800';
};

export const getRiskLabel = (level: RiskLevel | string): string => {
  return RISK_LABELS[level as RiskLevel] || level;
};

export const getRiskColor = (level: RiskLevel | string): string => {
  return RISK_COLORS[level as RiskLevel] || 'bg-gray-100 text-gray-800';
};

// Dropdown options for Product Management
export const PRODUCT_TYPE_OPTIONS = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const PRODUCT_STATUS_OPTIONS = Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const EPIC_STATUS_OPTIONS = Object.entries(EPIC_STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const FEATURE_STATUS_OPTIONS = Object.entries(FEATURE_STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const CONFIDENCE_OPTIONS = Object.entries(CONFIDENCE_LABELS).map(([value, label]) => ({
  value,
  label
}));

export const RISK_OPTIONS = Object.entries(RISK_LABELS).map(([value, label]) => ({
  value,
  label
}));