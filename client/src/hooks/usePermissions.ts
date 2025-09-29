import { useAuth } from './useAuth';
import {
  hasPermission,
  type PermissionResource,
  type PermissionAction,
  type Department,
  type EnhancedUserRole
} from '@shared/permissions';

/**
 * Hook for checking user permissions in React components
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * Check if current user has specific permission
   */
  const checkPermission = (
    resource: PermissionResource,
    action: PermissionAction,
    department?: Department
  ): boolean => {
    if (!user) return false;

    // Fallback to basic role checks for legacy compatibility
    if (!user.enhancedRole || !user.department) {
      // Legacy fallback - admin and manager can do most things
      if (user.role === 'admin') {
        return true; // Admin can do everything
      }
      if (user.role === 'manager' && (action === 'read' || action === 'create' || action === 'update')) {
        return resource === 'users' || resource === 'user_management';
      }
      if (action === 'read') {
        return true; // Everyone can read by default in legacy mode
      }
      return false;
    }

    // Use user's department if not specified
    const targetDepartment = department || user.department;
    if (!targetDepartment) return false;

    return hasPermission(
      user.enhancedRole as EnhancedUserRole,
      targetDepartment,
      resource,
      action
    );
  };

  /**
   * Check if current user can manage users
   */
  const canManageUsers = (): boolean => {
    return checkPermission('users', 'admin') ||
           checkPermission('user_management', 'admin');
  };

  /**
   * Check if current user can create users
   */
  const canCreateUsers = (): boolean => {
    return checkPermission('users', 'create') ||
           checkPermission('user_management', 'create');
  };

  /**
   * Check if current user can edit users
   */
  const canEditUsers = (): boolean => {
    return checkPermission('users', 'update') ||
           checkPermission('user_management', 'update');
  };

  /**
   * Check if current user can delete users
   */
  const canDeleteUsers = (): boolean => {
    return checkPermission('users', 'delete') ||
           checkPermission('user_management', 'delete');
  };

  /**
   * Check if current user can view users
   */
  const canViewUsers = (): boolean => {
    // Temporarily allow all authenticated users to view users
    return !!user;
    // return checkPermission('users', 'read') ||
    //        checkPermission('user_management', 'read');
  };

  /**
   * Check if current user can manage projects
   */
  const canManageProjects = (): boolean => {
    return checkPermission('projects', 'admin') ||
           checkPermission('projects', 'create') ||
           checkPermission('projects', 'update');
  };

  /**
   * Check if current user can view financial data
   */
  const canViewFinancials = (): boolean => {
    return checkPermission('financial_reports', 'read') ||
           checkPermission('budget_management', 'read');
  };

  /**
   * Check if current user can manage system settings
   */
  const canManageSystem = (): boolean => {
    return checkPermission('system_settings', 'admin');
  };

  /**
   * Check if current user can export data
   */
  const canExportData = (): boolean => {
    return checkPermission('reports', 'export');
  };

  /**
   * Check if current user has admin privileges
   */
  const isAdmin = (): boolean => {
    return user?.enhancedRole === 'super_admin' || user?.enhancedRole === 'admin';
  };

  /**
   * Check if current user has manager privileges
   */
  const isManager = (): boolean => {
    return user?.enhancedRole === 'manager' || isAdmin();
  };

  /**
   * Check if current user is in specific department
   */
  const isInDepartment = (department: Department): boolean => {
    return user?.department === department;
  };

  /**
   * Get user's role display name
   */
  const getRoleDisplayName = (): string => {
    if (!user?.enhancedRole) return 'Unknown';

    const roleNames: Record<EnhancedUserRole, string> = {
      'super_admin': 'Super Administrator',
      'admin': 'Administrator',
      'manager': 'Manager',
      'employee': 'Employee',
      'contractor': 'Contractor',
      'viewer': 'Viewer',
      'client': 'Client'
    };

    return roleNames[user.enhancedRole as EnhancedUserRole] || user.enhancedRole;
  };

  return {
    user,
    checkPermission,
    canManageUsers,
    canCreateUsers,
    canEditUsers,
    canDeleteUsers,
    canViewUsers,
    canManageProjects,
    canViewFinancials,
    canManageSystem,
    canExportData,
    isAdmin,
    isManager,
    isInDepartment,
    getRoleDisplayName
  };
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<T>(
  Component: React.ComponentType<T>,
  resource: PermissionResource,
  action: PermissionAction,
  fallback?: React.ComponentType | null
) {
  return function PermissionWrapper(props: T) {
    const { checkPermission } = usePermissions();

    if (!checkPermission(resource, action)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent />;
      }
      return null;
    }

    return <Component {...props} />;
  };
}