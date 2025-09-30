import React from 'react';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { getRoleDisplayName, getRoleTheme } from '@/lib/roleThemes';
import type { EnhancedUserRole, Department } from '@shared/permissions';
import {
  User,
  Settings,
  Bell,
  Palette,
  Shield,
  Activity,
  BarChart3,
  HelpCircle,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfileMenuProps {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    enhancedRole?: EnhancedUserRole | string;
    department?: Department | string;
    profileImageUrl?: string;
    position?: string;
  };
  isMobile?: boolean;
}

export function UserProfileMenu({ user, isMobile = false }: UserProfileMenuProps) {
  const [, setLocation] = useLocation();
  const theme = getRoleTheme(user?.enhancedRole);
  const roleDisplay = getRoleDisplayName(user?.enhancedRole);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const navigate = (path: string) => {
    setLocation(path);
  };

  const userDisplayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center space-x-2 md:space-x-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1"
          data-testid="button-user-profile-menu"
        >
          <UserAvatar
            firstName={user?.firstName}
            lastName={user?.lastName}
            profileImageUrl={user?.profileImageUrl}
            role={user?.enhancedRole}
            size="md"
            showBorder
          />
          {!isMobile && (
            <>
              <div className="hidden md:block text-sm text-left">
                <div className="font-medium text-foreground" data-testid="text-user-name">
                  {userDisplayName}
                </div>
                <div className="text-muted-foreground text-xs" data-testid="text-user-role">
                  {roleDisplay}
                </div>
              </div>
              <ChevronDown className="hidden md:block w-4 h-4 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end">
        {/* User Info Section */}
        <DropdownMenuLabel className="pb-3">
          <div className="flex items-center space-x-3">
            <UserAvatar
              firstName={user?.firstName}
              lastName={user?.lastName}
              profileImageUrl={user?.profileImageUrl}
              role={user?.enhancedRole}
              size="lg"
              showBorder
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base truncate">{userDisplayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={cn('text-xs', theme.text, theme.secondary)}
                >
                  {roleDisplay}
                </Badge>
                {user?.department && (
                  <Badge variant="outline" className="text-xs">
                    {user.department}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Main Menu Options */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate('/profile')}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/notifications/preferences')}
            className="cursor-pointer"
          >
            <Bell className="mr-2 h-4 w-4" />
            <span>Notification Preferences</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/settings/appearance')}
            className="cursor-pointer"
          >
            <Palette className="mr-2 h-4 w-4" />
            <span>Appearance</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/settings/security')}
            className="cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4" />
            <span>Security Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Activity & Stats */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate('/my-activity')}
            className="cursor-pointer"
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>My Activity</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/my-statistics')}
            className="cursor-pointer"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>My Statistics</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Help & Logout */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate('/help')}
            className="cursor-pointer"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
