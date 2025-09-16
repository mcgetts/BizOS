// Business Configuration Constants

export const BUSINESS_LIMITS = {
  // Team Management
  MAX_TEAM_MEMBERS: 50,

  // Project limits
  MAX_ACTIVE_PROJECTS: 100,
  MAX_CLIENTS: 1000,

  // Financial limits (for future use)
  MAX_INVOICE_AMOUNT: 100000,
  MAX_EXPENSE_AMOUNT: 10000
} as const;

// Role permissions
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CLIENT: 'client'
} as const;

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['manage_users', 'manage_projects', 'manage_finances', 'view_all'],
  [ROLES.MANAGER]: ['manage_projects', 'manage_finances', 'view_team'],
  [ROLES.EMPLOYEE]: ['view_assigned', 'manage_tasks'],
  [ROLES.CLIENT]: ['view_own_projects', 'view_own_invoices']
} as const;