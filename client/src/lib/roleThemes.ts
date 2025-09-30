// Role-Based Theme System for UI Components
// Provides consistent theming across notifications, avatars, and other role-specific UI elements

import type { EnhancedUserRole } from '@shared/permissions';

export interface RoleTheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  icon: string;
  border: string;
  gradient: string;
  avatarBg: string;
  avatarText: string;
}

export const ROLE_THEMES: Record<EnhancedUserRole, RoleTheme> = {
  super_admin: {
    primary: 'bg-purple-500',
    secondary: 'bg-purple-100',
    accent: 'bg-gradient-to-r from-purple-500 to-pink-500',
    text: 'text-purple-700',
    icon: 'text-purple-500',
    border: 'border-purple-300',
    gradient: 'from-purple-500 to-pink-500',
    avatarBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    avatarText: 'text-white',
  },
  admin: {
    primary: 'bg-blue-500',
    secondary: 'bg-blue-100',
    accent: 'bg-blue-600',
    text: 'text-blue-700',
    icon: 'text-blue-500',
    border: 'border-blue-300',
    gradient: 'from-blue-500 to-cyan-500',
    avatarBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    avatarText: 'text-white',
  },
  manager: {
    primary: 'bg-green-500',
    secondary: 'bg-green-100',
    accent: 'bg-green-600',
    text: 'text-green-700',
    icon: 'text-green-500',
    border: 'border-green-300',
    gradient: 'from-green-500 to-emerald-500',
    avatarBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    avatarText: 'text-white',
  },
  employee: {
    primary: 'bg-slate-500',
    secondary: 'bg-slate-100',
    accent: 'bg-slate-600',
    text: 'text-slate-700',
    icon: 'text-slate-500',
    border: 'border-slate-300',
    gradient: 'from-slate-500 to-gray-500',
    avatarBg: 'bg-gradient-to-br from-slate-500 to-gray-500',
    avatarText: 'text-white',
  },
  contractor: {
    primary: 'bg-gray-500',
    secondary: 'bg-gray-100',
    accent: 'bg-gray-600',
    text: 'text-gray-700',
    icon: 'text-gray-500',
    border: 'border-gray-300',
    gradient: 'from-gray-500 to-slate-500',
    avatarBg: 'bg-gradient-to-br from-gray-500 to-slate-500',
    avatarText: 'text-white',
  },
  viewer: {
    primary: 'bg-indigo-500',
    secondary: 'bg-indigo-100',
    accent: 'bg-indigo-600',
    text: 'text-indigo-700',
    icon: 'text-indigo-500',
    border: 'border-indigo-300',
    gradient: 'from-indigo-500 to-purple-500',
    avatarBg: 'bg-gradient-to-br from-indigo-500 to-purple-500',
    avatarText: 'text-white',
  },
  client: {
    primary: 'bg-orange-500',
    secondary: 'bg-orange-100',
    accent: 'bg-orange-600',
    text: 'text-orange-700',
    icon: 'text-orange-500',
    border: 'border-orange-300',
    gradient: 'from-orange-500 to-amber-500',
    avatarBg: 'bg-gradient-to-br from-orange-500 to-amber-500',
    avatarText: 'text-white',
  },
};

// Utility function to get theme for a role
export function getRoleTheme(role?: EnhancedUserRole | string): RoleTheme {
  if (!role || !(role in ROLE_THEMES)) {
    return ROLE_THEMES.employee; // Default theme
  }
  return ROLE_THEMES[role as EnhancedUserRole];
}

// Utility function to get role display name
export function getRoleDisplayName(role?: EnhancedUserRole | string): string {
  const roleMap: Record<EnhancedUserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    manager: 'Manager',
    employee: 'Employee',
    contractor: 'Contractor',
    viewer: 'Viewer',
    client: 'Client',
  };

  if (!role || !(role in roleMap)) {
    return 'Employee';
  }
  return roleMap[role as EnhancedUserRole];
}

// Utility function to generate initials from name
export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return 'U';

  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';

  return `${first}${last}` || 'U';
}
