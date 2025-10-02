// Enterprise Role-Based Access Control (RBAC) System
// This extends the existing user roles with granular permissions

export const DEPARTMENTS = [
  'executive',
  'sales',
  'finance',
  'operations',
  'support',
  'marketing',
  'hr',
  'it',
  'admin'
] as const;

export type Department = typeof DEPARTMENTS[number];

export const PERMISSION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'admin',
  'approve',
  'export',
  'import'
] as const;

export type PermissionAction = typeof PERMISSION_ACTIONS[number];

export const PERMISSION_RESOURCES = [
  // User & Access Management
  'users',
  'roles',
  'permissions',
  'audit_logs',

  // Business Data
  'clients',
  'companies',
  'projects',
  'tasks',
  'opportunities',
  'invoices',
  'expenses',
  'time_entries',

  // Content & Documents
  'documents',
  'knowledge_articles',
  'marketing_campaigns',
  'support_tickets',

  // System & Configuration
  'system_settings',
  'backup_management',
  'integrations',
  'reports',
  'analytics',

  // Financial
  'financial_reports',
  'budget_management',
  'payment_processing',

  // Administrative
  'user_management',
  'department_management',
  'notification_settings'
] as const;

export type PermissionResource = typeof PERMISSION_RESOURCES[number];

// Permission structure: department:resource:action
export type Permission = `${Department}:${PermissionResource}:${PermissionAction}`;

// Enhanced user roles with department context
export const ENHANCED_USER_ROLES = [
  'super_admin',     // Full system access
  'admin',           // Department admin
  'manager',         // Team/project manager
  'employee',        // Standard employee
  'contractor',      // Limited access contractor
  'viewer',          // Read-only access
  'client'           // External client access
] as const;

export type EnhancedUserRole = typeof ENHANCED_USER_ROLES[number];

// Permission templates for different roles
export const ROLE_PERMISSION_TEMPLATES: Record<EnhancedUserRole, {
  departments: Department[];
  permissions: Permission[];
  description: string;
}> = {
  super_admin: {
    departments: [...DEPARTMENTS],
    permissions: DEPARTMENTS.flatMap(dept =>
      PERMISSION_RESOURCES.flatMap(resource =>
        PERMISSION_ACTIONS.map(action => `${dept}:${resource}:${action}` as Permission)
      )
    ),
    description: 'Full system access across all departments and resources'
  },

  admin: {
    departments: ['admin', 'it', 'sales', 'operations', 'finance', 'marketing', 'support'],
    permissions: [
      // User management
      'admin:users:create', 'admin:users:read', 'admin:users:update', 'admin:users:delete',
      'admin:roles:create', 'admin:roles:read', 'admin:roles:update', 'admin:roles:delete',
      'admin:permissions:read', 'admin:permissions:update',
      'admin:audit_logs:read', 'admin:audit_logs:export',

      // System management
      'admin:system_settings:read', 'admin:system_settings:update',
      'admin:backup_management:read', 'admin:backup_management:admin',
      'admin:integrations:read', 'admin:integrations:update', 'admin:integrations:admin',

      // Reports and analytics
      'admin:reports:read', 'admin:reports:create', 'admin:reports:export',
      'admin:analytics:read',

      // Department management
      'admin:department_management:read', 'admin:department_management:update',
      'admin:notification_settings:read', 'admin:notification_settings:update',

      // Business data management (admin department has full access)
      'admin:clients:create', 'admin:clients:read', 'admin:clients:update', 'admin:clients:delete',
      'admin:companies:create', 'admin:companies:read', 'admin:companies:update', 'admin:companies:delete',
      'admin:projects:create', 'admin:projects:read', 'admin:projects:update', 'admin:projects:delete',
      'admin:tasks:create', 'admin:tasks:read', 'admin:tasks:update', 'admin:tasks:delete',
      'admin:opportunities:create', 'admin:opportunities:read', 'admin:opportunities:update', 'admin:opportunities:delete',

      // Financial management
      'admin:invoices:create', 'admin:invoices:read', 'admin:invoices:update', 'admin:invoices:delete',
      'admin:expenses:create', 'admin:expenses:read', 'admin:expenses:update', 'admin:expenses:delete', 'admin:expenses:approve',
      'admin:time_entries:create', 'admin:time_entries:read', 'admin:time_entries:update', 'admin:time_entries:delete', 'admin:time_entries:approve',
      'admin:financial_reports:read', 'admin:financial_reports:create', 'admin:financial_reports:export',
      'admin:budget_management:read', 'admin:budget_management:update',

      // Content management
      'admin:documents:create', 'admin:documents:read', 'admin:documents:update', 'admin:documents:delete',
      'admin:knowledge_articles:create', 'admin:knowledge_articles:read', 'admin:knowledge_articles:update', 'admin:knowledge_articles:delete',
      'admin:marketing_campaigns:create', 'admin:marketing_campaigns:read', 'admin:marketing_campaigns:update', 'admin:marketing_campaigns:delete',
      'admin:support_tickets:create', 'admin:support_tickets:read', 'admin:support_tickets:update', 'admin:support_tickets:delete'
    ],
    description: 'Administrative access with full business operations and system management capabilities'
  },

  manager: {
    departments: ['sales', 'operations', 'marketing', 'support'],
    permissions: [
      // Team management
      'sales:users:read', 'operations:users:read', 'marketing:users:read', 'support:users:read',

      // Business data management
      'sales:clients:create', 'sales:clients:read', 'sales:clients:update',
      'sales:companies:create', 'sales:companies:read', 'sales:companies:update',
      'sales:opportunities:create', 'sales:opportunities:read', 'sales:opportunities:update', 'sales:opportunities:delete',
      'sales:projects:create', 'sales:projects:read', 'sales:projects:update',
      'operations:projects:read', 'operations:projects:update',
      'operations:tasks:create', 'operations:tasks:read', 'operations:tasks:update', 'operations:tasks:delete',

      // Approval workflows
      'finance:expenses:approve', 'operations:time_entries:approve',

      // Reports
      'sales:reports:read', 'sales:reports:create', 'sales:reports:export',
      'operations:reports:read', 'operations:reports:create',
      'marketing:reports:read', 'marketing:reports:create',
      'support:reports:read'
    ],
    description: 'Management access with team oversight and approval capabilities'
  },

  employee: {
    departments: ['sales', 'operations', 'marketing', 'support', 'finance'],
    permissions: [
      // Own data management
      'sales:clients:read', 'sales:companies:read',
      'sales:opportunities:create', 'sales:opportunities:read', 'sales:opportunities:update',
      'operations:projects:read', 'operations:tasks:create', 'operations:tasks:read', 'operations:tasks:update',
      'operations:time_entries:create', 'operations:time_entries:read', 'operations:time_entries:update',
      'finance:expenses:create', 'finance:expenses:read', 'finance:expenses:update',

      // Content creation
      'operations:documents:create', 'operations:documents:read',
      'operations:knowledge_articles:create', 'operations:knowledge_articles:read', 'operations:knowledge_articles:update',
      'marketing:marketing_campaigns:read',
      'support:support_tickets:create', 'support:support_tickets:read', 'support:support_tickets:update',

      // Basic reporting
      'operations:reports:read'
    ],
    description: 'Standard employee access for daily work activities'
  },

  contractor: {
    departments: ['operations'],
    permissions: [
      // Limited project access
      'operations:projects:read',
      'operations:tasks:read', 'operations:tasks:update',
      'operations:time_entries:create', 'operations:time_entries:read',
      'operations:documents:read',

      // Own data only
      'operations:expenses:create', 'operations:expenses:read'
    ],
    description: 'Limited access for external contractors'
  },

  viewer: {
    departments: ['operations'],
    permissions: [
      // Read-only access
      'operations:projects:read',
      'operations:tasks:read',
      'operations:documents:read',
      'operations:knowledge_articles:read',
      'operations:reports:read'
    ],
    description: 'Read-only access for stakeholders and observers'
  },

  client: {
    departments: ['sales'],
    permissions: [
      // Client portal access
      'sales:projects:read',
      'sales:tasks:read',
      'sales:documents:read',
      'sales:invoices:read',
      'sales:support_tickets:create', 'sales:support_tickets:read'
    ],
    description: 'External client access to their projects and data'
  }
};

// Resource-specific permission rules
export const RESOURCE_PERMISSIONS: Record<PermissionResource, {
  description: string;
  sensitive: boolean;
  requiresApproval?: boolean;
  auditRequired: boolean;
}> = {
  users: { description: 'User account management', sensitive: true, auditRequired: true },
  roles: { description: 'Role and permission management', sensitive: true, auditRequired: true },
  permissions: { description: 'Permission system management', sensitive: true, auditRequired: true },
  audit_logs: { description: 'System audit trails', sensitive: true, auditRequired: true },

  clients: { description: 'Client contact management', sensitive: false, auditRequired: true },
  companies: { description: 'Company information management', sensitive: false, auditRequired: true },
  projects: { description: 'Project management', sensitive: false, auditRequired: true },
  tasks: { description: 'Task management', sensitive: false, auditRequired: false },
  opportunities: { description: 'Sales opportunity management', sensitive: false, auditRequired: true },
  invoices: { description: 'Invoice management', sensitive: true, auditRequired: true },
  expenses: { description: 'Expense management', sensitive: true, requiresApproval: true, auditRequired: true },
  time_entries: { description: 'Time tracking', sensitive: false, requiresApproval: true, auditRequired: false },

  documents: { description: 'Document management', sensitive: false, auditRequired: false },
  knowledge_articles: { description: 'Knowledge base management', sensitive: false, auditRequired: false },
  marketing_campaigns: { description: 'Marketing campaign management', sensitive: false, auditRequired: true },
  support_tickets: { description: 'Support ticket management', sensitive: false, auditRequired: false },

  system_settings: { description: 'System configuration', sensitive: true, auditRequired: true },
  backup_management: { description: 'Backup system management', sensitive: true, auditRequired: true },
  integrations: { description: 'Third-party integrations', sensitive: true, auditRequired: true },
  reports: { description: 'Report generation and access', sensitive: false, auditRequired: false },
  analytics: { description: 'Analytics and insights', sensitive: false, auditRequired: false },

  financial_reports: { description: 'Financial reporting', sensitive: true, auditRequired: true },
  budget_management: { description: 'Budget planning and management', sensitive: true, auditRequired: true },
  payment_processing: { description: 'Payment processing', sensitive: true, auditRequired: true },

  user_management: { description: 'User administration', sensitive: true, auditRequired: true },
  department_management: { description: 'Department administration', sensitive: true, auditRequired: true },
  notification_settings: { description: 'Notification configuration', sensitive: false, auditRequired: false }
};

// Utility functions for permission checking
export function hasPermission(
  userRole: EnhancedUserRole,
  userDepartment: Department,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  const roleTemplate = ROLE_PERMISSION_TEMPLATES[userRole];

  // Check if user has access to the department
  if (!roleTemplate.departments.includes(userDepartment) && userRole !== 'super_admin') {
    return false;
  }

  // Check specific permission
  const permission = `${userDepartment}:${resource}:${action}` as Permission;
  return roleTemplate.permissions.includes(permission);
}

export function getUserPermissions(
  userRole: EnhancedUserRole,
  userDepartment: Department
): Permission[] {
  const roleTemplate = ROLE_PERMISSION_TEMPLATES[userRole];

  if (userRole === 'super_admin') {
    return roleTemplate.permissions;
  }

  // Filter permissions by user's department
  return roleTemplate.permissions.filter(permission =>
    permission.startsWith(`${userDepartment}:`) ||
    permission.startsWith('admin:') && userRole === 'admin'
  );
}

export function getResourcesForUser(
  userRole: EnhancedUserRole,
  userDepartment: Department
): PermissionResource[] {
  const permissions = getUserPermissions(userRole, userDepartment);
  const resources = new Set<PermissionResource>();

  permissions.forEach(permission => {
    const [, resource] = permission.split(':') as [Department, PermissionResource, PermissionAction];
    resources.add(resource);
  });

  return Array.from(resources);
}

export function canAccessResource(
  userRole: EnhancedUserRole,
  userDepartment: Department,
  resource: PermissionResource
): boolean {
  const userResources = getResourcesForUser(userRole, userDepartment);
  return userResources.includes(resource);
}

export function requiresAuditLog(resource: PermissionResource): boolean {
  return RESOURCE_PERMISSIONS[resource]?.auditRequired || false;
}

export function isSensitiveResource(resource: PermissionResource): boolean {
  return RESOURCE_PERMISSIONS[resource]?.sensitive || false;
}

export function requiresApproval(resource: PermissionResource): boolean {
  return RESOURCE_PERMISSIONS[resource]?.requiresApproval || false;
}